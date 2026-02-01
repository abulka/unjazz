/**
 * Cloudflare Worker to proxy GitHub Release audio files with CORS headers
 * Deploy to: https://workers.cloudflare.com/
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const audioUrl = url.searchParams.get('url');
    
    // Debug endpoint
    if (url.pathname === '/debug') {
      return new Response('Worker is running!', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
          'X-Worker-Version': '1.1'
        }
      });
    }
    
    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range, Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    // Validate URL parameter exists
    if (!audioUrl) {
      return new Response('Missing url parameter. Usage: ?url=https://github.com/...', { 
        status: 400,
        headers: { 
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Security: Only allow GitHub release URLs
    const githubReleasePattern = /^https:\/\/github\.com\/[\w-]+\/[\w-]+\/releases\/download\//;
    if (!githubReleasePattern.test(audioUrl)) {
      return new Response('Invalid URL. Only GitHub release URLs are allowed.', { 
        status: 403,
        headers: { 
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    try {
      // Fetch from GitHub (follows redirects automatically)
      const githubResponse = await fetch(audioUrl, {
        method: request.method, // Forward GET or HEAD
        headers: {
          // Forward Range header for audio seeking/scrubbing
          'Range': request.headers.get('Range') || '',
          // GitHub Release assets are public, no auth needed
        }
      });

      // Check if GitHub returned an error
      if (!githubResponse.ok) {
        return new Response(`GitHub error: ${githubResponse.status} ${githubResponse.statusText}`, {
          status: githubResponse.status,
          headers: { 
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // Clone response headers and add CORS
      const responseHeaders = new Headers();
      
      // Copy essential headers from GitHub
      for (const [key, value] of githubResponse.headers.entries()) {
        // Skip headers that might cause issues
        if (!['set-cookie', 'connection', 'transfer-encoding'].includes(key.toLowerCase())) {
          responseHeaders.set(key, value);
        }
      }
      
      // Override/add CORS headers
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type');
      responseHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
      
      // Cache for 1 hour (GitHub releases are immutable)
      responseHeaders.set('Cache-Control', 'public, max-age=3600');

      // For HEAD requests, return empty body
      const body = request.method === 'HEAD' ? null : githubResponse.body;

      // Return proxied response with CORS headers
      return new Response(body, {
        status: githubResponse.status,
        statusText: githubResponse.statusText,
        headers: responseHeaders
      });

    } catch (error) {
      return new Response(`Proxy error: ${error.message}`, {
        status: 500,
        headers: { 
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
