import { useEffect } from "react";

import { usePathname } from "next/navigation";

import { getTitleFromPathname } from "@/lib/utils/page-title";

export function usePageTitle() {
  const pathname = usePathname();

  useEffect(() => {
    const title = getTitleFromPathname(pathname);
    document.title = title;
  }, [pathname]);
}
