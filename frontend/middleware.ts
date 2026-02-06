import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const role = request.cookies.get('role')?.value;
    const path = request.nextUrl.pathname;

    // 1. Check if trying to access protected routes
    const isProtected =
        path.startsWith('/admin') ||
        path.startsWith('/courier') ||
        path.startsWith('/customer');

    if (isProtected) {
        // A. Not Authenticated -> Redirect to Login
        if (!token || !role) {
            return NextResponse.redirect(new URL('/', request.url));
        }

        // B. Role Authorization Check
        // If trying to access admin pages but role is not admin
        if (path.startsWith('/admin') && role !== 'admin') {
            return redirectToDashboard(role, request.url);
        }

        // If trying to access courier pages but role is not courier
        if (path.startsWith('/courier') && role !== 'courier') {
            return redirectToDashboard(role, request.url);
        }

        // If trying to access customer pages but role is not customer
        if (path.startsWith('/customer') && role !== 'customer') {
            return redirectToDashboard(role, request.url);
        }
    }

    // 2. Redirect logged-in users away from login page if they try to access it
    if (path === '/' || path === '/login') {
        if (token && role) {
            return redirectToDashboard(role, request.url);
        }
    }

    return NextResponse.next();
}

function redirectToDashboard(role: string, baseUrl: string) {
    let dashboard = '/';
    if (role === 'admin') dashboard = '/admin/dashboard';
    else if (role === 'courier') dashboard = '/courier/dashboard';
    else if (role === 'customer') dashboard = '/customer/dashboard';

    return NextResponse.redirect(new URL(dashboard, baseUrl));
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
