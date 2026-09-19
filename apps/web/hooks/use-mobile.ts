import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Lazy initializer instead of an effect: reads the width once, synchronously,
  // on the first render, so there is nothing to set imperatively afterwards.
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(() =>
    typeof window === "undefined"
      ? undefined
      : window.innerWidth < MOBILE_BREAKPOINT,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
