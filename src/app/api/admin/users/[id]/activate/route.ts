import { NextRequest, NextResponse } from 'next/server';
import { adminErrorResponse, AdminApiError, requireAdmin } from '@/lib/admin/guard';
import { markEmailVerified, sendWelcomeEmail } from '@/lib/account';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models';
import { AuditLog } from '@/models/AuditLog';

/**
 * POST /api/admin/users/:id/activate — ręczna aktywacja konta, gdy e-mail z linkiem
 * nie dotarł. Ustawia to samo co kliknięcie linku (`markEmailVerified`) i wysyła
 * standardowy e-mail powitalny.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;

    await connectToDatabase();

    const user = await User.findById(id);
    if (!user) throw new AdminApiError(404, 'Nie znaleziono użytkownika.');
    if (user.emailVerified !== false) throw new AdminApiError(400, 'To konto jest już aktywne.');

    markEmailVerified(user);
    await user.save();

    await AuditLog.create({
      adminId: admin.id,
      adminName: admin.name || admin.email,
      action: 'update',
      resource: 'users',
      recordId: String(user._id),
      recordLabel: user.name,
      changedFields: ['emailVerified'],
      summary: `${admin.name || admin.email} aktywował(a) konto użytkownika „${user.name}” ręcznie`,
    }).catch(error => console.error('Failed to write audit log:', error));

    const welcomeSent = await sendWelcomeEmail(user).catch(() => false);

    return NextResponse.json({
      message: 'Konto zostało aktywowane.',
      welcomeEmailSent: welcomeSent,
    });
  } catch (error) {
    return adminErrorResponse(error, 'POST /api/admin/users/[id]/activate');
  }
}
