import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // "never" (the default) 307-redirects /log/ to /log. The build's prerender
    // pass always requests "<route>/" with redirects disabled, so every route
    // but "/" would fail to render. "preserve" serves both spellings.
    trailingSlash: "preserve",
  });

  return router;
};
