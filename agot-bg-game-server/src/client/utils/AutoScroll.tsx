import { useTranslation } from "../i18n";
import React, { ReactNode, useEffect } from "react";
import classNames from "classnames";
import { useStickToBottom } from "use-stick-to-bottom";

// use-stick-to-bottom tracks the mouse button on the document and pauses
// following while it believes text is being selected. A native drag (e.g. of
// an image) swallows the mouseup, so following would stay paused until the
// next click. Release the button state once the drag is over.
globalThis.document?.addEventListener(
  "dragend",
  () => document.dispatchEvent(new window.MouseEvent("mouseup")),
  true
);

interface AutoScrollProps {
  children: ReactNode;
  className?: string;
  scrollViewClassName?: string;
  initialScrollBehavior?: "auto" | "smooth";
}

export default function AutoScroll({
  children,
  className,
  scrollViewClassName,
  initialScrollBehavior = "smooth"
}: AutoScrollProps): React.JSX.Element {
  const { t } = useTranslation();
  const { scrollRef, contentRef, isAtBottom, scrollToBottom, state } =
    useStickToBottom({
      initial: initialScrollBehavior === "auto" ? "instant" : "smooth",
      resize: "smooth"
    });

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    let previousHeight: number | undefined;
    const observer = new ResizeObserver(([entry]) => {
      const height = entry.contentRect.height;
      const difference =
        previousHeight === undefined ? 0 : height - previousHeight;
      previousHeight = height;
      if (difference === 0) return;

      // A growing viewport (e.g. the mobile keyboard closing after sending a
      // message) clamps scrollTop, and the resulting scroll event would be
      // mistaken for the user scrolling up and release the bottom lock.
      // Flag it as a resize the same way the hook does for content resizes.
      state.resizeDifference = difference;
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (state.resizeDifference === difference) {
            state.resizeDifference = 0;
          }
        }, 1);
      });

      void scrollToBottom({
        animation: "instant",
        preserveScrollPosition: true
      });
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [scrollRef, scrollToBottom, state]);

  return (
    <div className={classNames("auto-scroll position-relative", className)}>
      <div
        ref={scrollRef}
        className={classNames("auto-scroll-viewport", scrollViewClassName)}
      >
        <div ref={contentRef}>{children}</div>
      </div>
      {!isAtBottom && (
        <button
          type="button"
          className="auto-scroll-follow btn btn-secondary rounded-circle"
          aria-label={t("autoScroll.scrollToLatest60df3c")}
          onClick={() => void scrollToBottom()}
        >
          <span aria-hidden="true">&#8595;</span>
        </button>
      )}
    </div>
  );
}
