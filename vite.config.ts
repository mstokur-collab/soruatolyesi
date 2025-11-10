import path from 'path';
import type { OutgoingHttpHeaders } from 'http';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const TEXTUAL_CONTENT = /^(text\/|application\/(javascript|json|xml))/i;

const appendUtf8Charset = (value: string) => {
  if (!TEXTUAL_CONTENT.test(value) || /charset\s*=/i.test(value)) {
    return value;
  }
  return `${value}; charset=UTF-8`;
};

const normalizeHeaderRecord = (headers?: OutgoingHttpHeaders) => {
  if (!headers) {
    return;
  }
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === 'content-type') {
      const headerValue = headers[key];
      if (typeof headerValue === 'string') {
        headers[key] = appendUtf8Charset(headerValue);
      }
    }
  }
};

const createUtf8Middleware = () => {
  return (_req, res, next) => {
    const originalSetHeader = res.setHeader;
    res.setHeader = function setHeaderWithCharset(
      key: string,
      value: number | string | ReadonlyArray<string>
    ) {
      if (typeof key === 'string' && key.toLowerCase() === 'content-type' && typeof value === 'string') {
        return originalSetHeader.call(this, key, appendUtf8Charset(value));
      }
      return originalSetHeader.call(this, key, value);
    };

    const originalWriteHead = res.writeHead;
    res.writeHead = function writeHeadWithCharset(...args: any[]) {
      if (args.length > 1) {
        const hasReasonPhrase = typeof args[1] === 'string';
        const headersIndex = hasReasonPhrase ? 2 : 1;
        const headers = args[headersIndex];
        if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
          normalizeHeaderRecord(headers as OutgoingHttpHeaders);
        }
      } else {
        const existing = res.getHeader('Content-Type');
        if (typeof existing === 'string') {
          res.setHeader('Content-Type', appendUtf8Charset(existing));
        }
      }
      return originalWriteHead.apply(this, args as any);
    };

    next();
  };
};

const enforceUtf8Headers = () => {
  return {
    name: 'enforce-utf8-charset',
    configureServer(server: { middlewares: { use: (fn: any) => void } }) {
      server.middlewares.use(createUtf8Middleware());
    },
    configurePreviewServer(server: { middlewares: { use: (fn: any) => void } }) {
      server.middlewares.use(createUtf8Middleware());
    },
  };
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), enforceUtf8Headers()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          output: {
            manualChunks: {
              react: ['react', 'react-dom'],
              firebase: [
                'firebase/app',
                'firebase/auth',
                'firebase/firestore',
                'firebase/database',
                'firebase/analytics'
              ],
            },
          },
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
