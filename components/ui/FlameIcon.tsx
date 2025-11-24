import { SVGProps } from "react";

export default function FlameIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 2C9 6 14 7 14 12c0 1.654-1.346 3-3 3s-3-1.346-3-3C8 7 11 5 12 2zm0 20c-4.411 0-8-3.589-8-8 0-3.093 1.751-5.811 4.337-7.112C8.133 7.623 8 8.789 8 9.5 8 12.536 10.462 15 13.5 15c2.584 0 4.747-1.938 4.972-4.454C19.713 12 20 13.951 20 16c0 4.411-3.589 8-8 8z" />
    </svg>
  );
}
