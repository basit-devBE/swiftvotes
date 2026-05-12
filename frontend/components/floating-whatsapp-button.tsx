const whatsappUrl = "https://wa.me/233556860946";

function WhatsAppIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 32 32"
      fill="currentColor"
    >
      <path d="M16.02 3.2A12.74 12.74 0 0 0 5.08 22.45L3.2 29.12l6.84-1.8a12.7 12.7 0 0 0 5.98 1.51h.01A12.82 12.82 0 0 0 28.8 16.05 12.78 12.78 0 0 0 16.02 3.2Zm0 23.47h-.01a10.57 10.57 0 0 1-5.39-1.48l-.39-.23-4.06 1.07 1.08-3.95-.26-.41a10.54 10.54 0 1 1 9.03 5Zm5.78-7.89c-.32-.16-1.87-.92-2.16-1.03-.29-.1-.5-.16-.71.16-.21.32-.82 1.03-1.01 1.24-.18.21-.37.24-.69.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.88-1.77-2.2-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.1-.21.05-.4-.03-.55-.08-.16-.71-1.71-.98-2.35-.26-.61-.52-.53-.71-.54h-.6c-.21 0-.55.08-.84.4-.29.32-1.11 1.08-1.11 2.64 0 1.56 1.13 3.06 1.29 3.27.16.21 2.23 3.4 5.39 4.76.75.32 1.34.52 1.8.66.76.24 1.45.21 1.99.13.61-.09 1.87-.76 2.13-1.5.26-.74.26-1.37.18-1.5-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  );
}

export function FloatingWhatsAppButton() {
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with SwiftVote on WhatsApp"
      className="fixed bottom-5 right-5 z-[80] inline-flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-full bg-[#25d366] px-4 text-sm font-bold text-white shadow-[0_18px_42px_-18px_rgba(7,17,31,0.55)] ring-1 ring-white/30 transition hover:-translate-y-0.5 hover:bg-[#1fbd5a] focus:outline-none focus:ring-4 focus:ring-[#25d366]/25 sm:bottom-6 sm:right-6"
    >
      <WhatsAppIcon />
      <span className="hidden pr-1 sm:inline">Chat with us</span>
    </a>
  );
}
