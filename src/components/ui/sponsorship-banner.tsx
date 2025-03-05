import { FaGithub } from "react-icons/fa";
import { HiHeart } from "react-icons/hi";

export function SponsorshipBanner() {
  return (
    <div className="p-4 border-t border-border bg-accent">
      <div className="flex items-center gap-2 mb-2">
        <FaGithub className="h-5 w-5 text-accent-foreground" />
        <span className="text-sm font-medium text-accent-foreground">
          Support FluidCalendar
        </span>
      </div>
      <p className="text-sm text-accent-foreground/80 mb-3">
        Help keep this project alive and get early access to new features
      </p>
      <a
        href="https://github.com/sponsors/eibrahim"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-accent focus:ring-ring"
      >
        <HiHeart className="h-4 w-4" />
        Sponsor Now
      </a>
    </div>
  );
}
