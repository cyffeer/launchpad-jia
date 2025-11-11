import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  const url = request.nextUrl.clone();

  if (pathname === "/" && host.includes("hellojia.ai")) {
    url.pathname = "/job-portal";
    return NextResponse.rewrite(url);
  }

  // NOTE: Previously, traffic to /dashboard, /job-openings, and /login on hirejia.ai was redirected to hellojia.ai.
  // This caused applicants to be pushed out of the in-app job openings flow. We remove job-openings (and dashboard)
  // from this cross-host redirect to keep applicants in-app. If a dedicated marketing host is needed later,
  // guard redirects behind an env flag rather than hard-coding.
  if (host.includes("hirejia.ai") && pathname.startsWith("/login")) {
    const newUrl = new URL(request.url);
    newUrl.hostname = "hellojia.ai";
    return NextResponse.redirect(newUrl);
  }

  if (host.startsWith("admin.hirejia.ai") && pathname === "/") {
    const url = request.nextUrl.clone();
    // Redirect to admin-portal
    url.pathname = `/admin-portal`;
    return NextResponse.rewrite(url);
  }
   // Redirect to hirejia.ai for recruiter portal
  if (!host.includes("hirejia") && !host.includes("localhost") && pathname.includes("old-dashboard")) {
    const newUrl = new URL(request.url);
    newUrl.hostname = `hirejia.ai`;
    return NextResponse.redirect(newUrl);
  }

  // Redirect to hellojia.ai for applicant portal (DISABLED for in-app job openings and applicant pages)
  // Keeping users in-app avoids unexpected cross-domain navigation when viewing job openings from the portal.
  // If you need to force applicant pages to live on a separate host, re-enable this with an env toggle.
  // if (!host.includes("hellojia") && !host.includes("localhost") && (pathname.includes("applicant") || pathname.includes("job-openings"))) {
  //   const newUrl = new URL(request.url);
  //   newUrl.hostname = `hellojia.ai`;
  //   return NextResponse.redirect(newUrl);
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/recruiter-dashboard/:path*',
    '/applicant/:path*',
    '/dashboard/:path*',
    '/job-openings/:path*',
    '/whitecloak/:path*',
    '/admin-portal/:path*',
    '/'
  ],
};