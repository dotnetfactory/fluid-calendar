import { FaGithub } from "react-icons/fa";
import { HiHeart } from "react-icons/hi";

// Open source version of the sponsorship banner - shows GitHub sponsor link
export default function SponsorshipBanner() {
  return (
    <div className="border-t border-border bg-accent p-4">
      <div className="mb-2 flex items-center gap-2">
        <FaGithub className="h-5 w-5 text-accent-foreground" />
        <span className="text-sm font-medium text-accent-foreground">
          Support FluidCalendar
        </span>
      </div>
      <p className="mb-3 text-sm text-accent-foreground/80">
        Help keep this project alive and get early access to new features
      </p>
      <a
        href="https://github.com/sponsors/eibrahim"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-accent"
      >
        <HiHeart className="h-4 w-4" />
        Sponsor Now
      </a>
    </div>
  );
}
