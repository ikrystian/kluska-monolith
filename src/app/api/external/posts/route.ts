import { NextRequest, NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { Article } from '@/models/Article';
import { ArticleCategory } from '@/models/ArticleCategory';
import { SocialPost } from '@/models/SocialPost';
import { User } from '@/models/User';
import { parseRecipe } from '@/lib/article-recipe';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-API-Key, X-API-Code, X-Auth-Code, x-api-key, x-api-code, x-auth-code',
  };
}

const DEFAULT_SECRET = 'kluska-external-posts-secret-token';

function getExpectedAuthCode(): string {
  return (
    process.env.EXTERNAL_POSTS_API_KEY ||
    process.env.EXTERNAL_API_KEY ||
    DEFAULT_SECRET
  );
}

function extractAuthCode(request: NextRequest, body: any): string | null {
  // 1. Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice('Bearer '.length).trim();
    }
    return authHeader.trim();
  }

  // 2. Custom header
  const customKey =
    request.headers.get('x-api-key') ||
    request.headers.get('x-api-code') ||
    request.headers.get('x-auth-code');
  if (customKey) {
    return customKey.trim();
  }

  // 3. Body parameters
  if (body && typeof body === 'object') {
    if (typeof body.code === 'string') return body.code.trim();
    if (typeof body.apiKey === 'string') return body.apiKey.trim();
    if (typeof body.api_key === 'string') return body.api_key.trim();
    if (typeof body.authCode === 'string') return body.authCode.trim();
    if (typeof body.secret === 'string') return body.secret.trim();
  }

  // 4. Query string
  const url = new URL(request.url);
  const qCode =
    url.searchParams.get('code') ||
    url.searchParams.get('apiKey') ||
    url.searchParams.get('key');
  if (qCode) {
    return qCode.trim();
  }

  return null;
}

function extractUserId(body: any, request: NextRequest): string | null {
  if (body && typeof body === 'object') {
    if (typeof body.userId === 'string') return body.userId.trim();
    if (typeof body.authorId === 'string') return body.authorId.trim();
    if (typeof body.user_id === 'string') return body.user_id.trim();
    if (typeof body.author_id === 'string') return body.author_id.trim();

    if (body.post && typeof body.post === 'object') {
      if (typeof body.post.userId === 'string') return body.post.userId.trim();
      if (typeof body.post.authorId === 'string') return body.post.authorId.trim();
      if (typeof body.post.user_id === 'string') return body.post.user_id.trim();
      if (typeof body.post.author_id === 'string') return body.post.author_id.trim();
    }
  }

  const url = new URL(request.url);
  const qUserId =
    url.searchParams.get('userId') ||
    url.searchParams.get('authorId') ||
    url.searchParams.get('user_id');
  if (qUserId) {
    return qUserId.trim();
  }

  return null;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      status: 'active',
      description: 'Zewnętrzny endpoint do publikowania wpisów w bazie wiedzy (i postów)',
      expectedAuthEnvVar: 'EXTERNAL_POSTS_API_KEY',
      usage: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'TWÓJ_KOD_AUTORYZACJI (lub w polu code w ciele zapytania)',
        },
        body: {
          code: 'TWÓJ_KOD_AUTORYZACJI',
          userId: 'ID_UŻYTKOWNIKA_W_IMIENIU_KTÓREGO_PUBLIKUJESZ',
          title: 'Tytuł wpisu',
          content: 'Treść wpisu (HTML lub tekst)',
          category: 'Kategoria (np. Trening, Dieta, Regeneracja - opcjonalnie)',
          coverImageUrl: 'https://... (opcjonalnie)',
          imageHint: 'Krótki opis zdjęcia (opcjonalnie)',
          status: 'published (domyślnie) | draft',
          type: 'article (domyślnie, wpis bazy wiedzy) | social (post społecznościowy)',
          recipe:
            'Opcjonalnie, dla przepisów (kategoria "Przepisy"): { dishName?, servings?, prepMinutes?, mealType?: Breakfast|Lunch|Dinner|Snack, calories, protein, carbs, fat } — makro na 1 porcję; pozwala dodać danie do dzienniczka kalorii',
        },
      },
    },
    { status: 200, headers: corsHeaders() }
  );
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => ({}));
    const providedCode = extractAuthCode(request, rawBody);
    const expectedCode = getExpectedAuthCode();

    if (!providedCode || providedCode !== expectedCode) {
      return NextResponse.json(
        {
          error: 'Brak autoryzacji (Unauthorized)',
          message:
            'Niepoprawny lub brakujący kod autoryzacyjny. Przekaż kod w nagłówku x-api-key, Authorization: Bearer <kod>, parametrze ?code=... lub w polu "code" w ciele JSON.',
        },
        { status: 401, headers: corsHeaders() }
      );
    }

    const userId = extractUserId(rawBody, request);
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Brak ID użytkownika (Bad Request)',
          message:
            'Pole "userId" (lub "authorId") jest wymagane. Wskaż id użytkownika, w imieniu którego ma być opublikowany wpis.',
        },
        { status: 400, headers: corsHeaders() }
      );
    }

    await connectToDatabase();

    let user: any = null;
    if (isValidObjectId(userId)) {
      user = await User.findById(userId);
    }
    if (!user) {
      user = await User.findOne({
        $or: [
          { _id: userId },
          { email: userId.toLowerCase() },
          { guestDeviceId: userId },
        ],
      });
    }

    if (!user) {
      return NextResponse.json(
        {
          error: 'Użytkownik nie istnieje (Not Found)',
          message: `Nie znaleziono użytkownika o identyfikatorze: ${userId}`,
        },
        { status: 404, headers: corsHeaders() }
      );
    }

    const postData =
      rawBody.post && typeof rawBody.post === 'object' ? rawBody.post : rawBody;
    const postType = (postData.type || rawBody.type || 'article').toLowerCase();

    // 1. Social Post (if explicitly requested)
    if (postType === 'social') {
      const imageUrl =
        postData.imageUrl || postData.coverImageUrl || postData.image || '';
      const description =
        postData.description || postData.content || postData.title || '';

      if (!imageUrl && !description) {
        return NextResponse.json(
          {
            error: 'Niekompletne dane posta (Bad Request)',
            message: 'Dla posta społecznościowego wymagane jest pole "imageUrl" lub "description".',
          },
          { status: 400, headers: corsHeaders() }
        );
      }

      const socialPost = new SocialPost({
        authorId: user._id.toString(),
        authorNickname: user.name || user.email || 'Użytkownik',
        authorAvatarUrl: user.avatarUrl,
        imageUrl: imageUrl || 'https://picsum.photos/800/800',
        description: description.slice(0, 500),
        likes: [],
        likesCount: 0,
      });

      await socialPost.save();

      return NextResponse.json(
        {
          success: true,
          message: 'Post społecznościowy został pomyślnie opublikowany',
          type: 'social',
          post: socialPost.toJSON(),
        },
        { status: 201, headers: corsHeaders() }
      );
    }

    // 2. Knowledge Base Article (Default)
    const title = postData.title;
    const content =
      postData.content || postData.description || postData.text || postData.body;
    const category = postData.category || 'Ogólne';
    const coverImageUrl =
      postData.coverImageUrl || postData.imageUrl || postData.image;
    const imageHint = postData.imageHint;
    const status = postData.status === 'draft' ? 'draft' : 'published';
    const recipe = parseRecipe(postData.recipe ?? rawBody.recipe);

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        {
          error: 'Brak tytułu posta (Bad Request)',
          message: 'Pole "title" jest wymagane do utworzenia wpisu w bazie wiedzy.',
        },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        {
          error: 'Brak treści posta (Bad Request)',
          message: 'Pole "content" jest wymagane do utworzenia wpisu w bazie wiedzy.',
        },
        { status: 400, headers: corsHeaders() }
      );
    }

    const trimmedCategory = category.trim();

    const article = new Article({
      title: title.trim(),
      content: content.trim(),
      authorId: user._id.toString(),
      authorName: user.name || user.email || 'Autor',
      category: trimmedCategory,
      status,
      coverImageUrl: coverImageUrl?.trim() || undefined,
      imageHint: imageHint?.trim() || undefined,
      ...(recipe ? { recipe } : {}),
    });

    await article.save();

    // Upsert article category if provided so it appears in category filters
    if (trimmedCategory && trimmedCategory !== 'Bez kategorii') {
      await ArticleCategory.findOneAndUpdate(
        { name: trimmedCategory },
        { $setOnInsert: { name: trimmedCategory } },
        { upsert: true }
      ).catch(() => {});
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Wpis został pomyślnie dodany do bazy wiedzy',
        type: 'article',
        post: article.toJSON(),
      },
      { status: 201, headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error in external post API:', error);
    return NextResponse.json(
      {
        error: 'Błąd serwera (Internal Server Error)',
        details: error?.message || 'Nieznany błąd',
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}
