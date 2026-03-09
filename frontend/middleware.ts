import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

    const isDev = process.env.NODE_ENV === 'development';

    // Strict CSP Policy - Relaxed for development
    const scriptSrc = isDev
        ? "'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com"
        : `'self' 'nonce-${nonce}' 'strict-dynamic' https://accounts.google.com`;

    const connectSrc = isDev
        ? "'self' http://localhost:5000 ws://localhost:5000 http://localhost:3000 ws://localhost:3000 https://accounts.google.com"
        : "'self' https://api.tzir-delivery.co.il https://accounts.google.com";

    const reportUri = isDev
        ? "http://localhost:5000/api/security/csp-report"
        : "/api/security/csp-report";

    const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline' https://accounts.google.com;
    img-src 'self' blob: data: https: https://*.googleusercontent.com;
    connect-src ${connectSrc};
    font-src 'self' data: https://fonts.gstatic.com;
    frame-src 'self' https://accounts.google.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
    report-uri ${reportUri};
  `.replace(/\s{2,}/g, ' ').trim();

    const response = NextResponse.next();

    // Security Headers
    response.headers.set('Content-Security-Policy', cspHeader);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');

    // Set nonce in header for client-side hydration if needed
    response.headers.set('x-nonce', nonce);

    return response;
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
