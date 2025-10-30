'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AthleteDashboardPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Panel Sportowca</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Lorem Ipsum</CardTitle>
            <CardDescription>Dolor sit amet consectetur</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
              exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Duis Aute Irure</CardTitle>
            <CardDescription>Reprehenderit in voluptate</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
              fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
              culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sed Ut Perspiciatis</CardTitle>
            <CardDescription>Unde omnis iste natus</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
              laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi
              architecto beatae vitae dicta sunt explicabo.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nemo Enim Ipsam</CardTitle>
            <CardDescription>Voluptatem quia voluptas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia
              consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro
              quisquam est, qui dolorem ipsum quia dolor sit amet.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>At Vero Eos</CardTitle>
            <CardDescription>Et accusamus et iusto</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium
              voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint
              occaecati cupiditate non provident.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Temporibus Autem</CardTitle>
            <CardDescription>Quibusdam et aut officiis</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe
              eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum
              rerum hic tenetur a sapiente delectus.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Informacje Dodatkowe</CardTitle>
          <CardDescription>Lorem ipsum dolor sit amet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2 font-semibold">Nam Libero Tempore</h3>
            <p className="text-sm text-muted-foreground">
              Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus
              id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor
              repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus
              saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Itaque Earum Rerum</h3>
            <p className="text-sm text-muted-foreground">
              Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus
              maiores alias consequatur aut perferendis doloribus asperiores repellat. Lorem ipsum
              dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore
              et dolore magna aliqua.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Quis Autem Vel Eum</h3>
            <p className="text-sm text-muted-foreground">
              Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae
              consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur. Ut enim ad
              minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
