// mdbook_proxy.ts
const DEFAULT_PORT = 8000;
const BOOK_DIR = "./book"; // mdbook生成目录

// MIME类型映射
const MIME_TYPES: Record<string, string> = {
  "html": "text/html",
  "css": "text/css",
  "js": "application/javascript",
  "json": "application/json",
  "png": "image/png",
  "jpg": "image/jpeg",
  "jpeg": "image/jpeg",
  "gif": "image/gif",
  "svg": "image/svg+xml",
  "ico": "image/x-icon",
  "woff": "font/woff",
  "woff2": "font/woff2",
};

// 获取安全的文件路径
const resolvePath = (urlPath: string): string => {
  const basePath = `${Deno.cwd()}/${BOOK_DIR}`;
  
  // URI解码中文路径
  const decodedPath = decodeURIComponent(urlPath);
  
  // 移除开头的斜杠并保留目录结构
  let requestPath = decodedPath.replace(/^\/+/, '');
  
  // 默认首页处理
  if (requestPath === '' || requestPath.endsWith('/')) {
    requestPath = `${requestPath}index.html`;
  }

  // 严格路径验证（允许中文目录但禁止路径遍历）
  const pathRegex = /^[\w\-\s\u4e00-\u9fa5()\[\]\/._]+(\.[\w-]+)*$/;
  if (!pathRegex.test(requestPath) || requestPath.includes('../')) {
    console.log(`Invalid path attempt: ${requestPath}`);
    throw new Error("Invalid path");
  }

  // 保留原始目录结构
  const fullPath = `${basePath}/${requestPath}`;
  
  return fullPath.replace(/\/+/g, '/');
};

// 获取Content-Type
const getContentType = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase() || "";
  return MIME_TYPES[ext] || "text/plain";
};

// 处理请求
async function handleRequest(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);

    // 解析安全路径
    const filePath = resolvePath(url.pathname);
    
    // 读取文件
    const file = await Deno.readFile(filePath);
    const contentType = getContentType(filePath);

    return new Response(file, {
      headers: {
        "content-type": `${contentType}; charset=utf-8`,
        "cache-control": "public, max-age=3600" // 1小时缓存
      },
    });

  } catch (error) {
    console.error(`Error: ${error}`);
    
    // 自定义404页面
    if (error instanceof Deno.errors.NotFound) {
      return new Response("Page Not Found", {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }

    return new Response("Internal Server Error", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
}

// 启动服务
console.log(`🚀 Server running at http://localhost:${DEFAULT_PORT}/`);
Deno.serve({ port: DEFAULT_PORT }, handleRequest);