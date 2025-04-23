export const getTitleFromPathname = (pathname: string) => {
  switch (pathname) {
    case "/calendar":
      return "Calendar | FluidCalendar";
    case "/tasks":
      return "Tasks | FluidCalendar";
    case "/focus":
      return "Focus | FluidCalendar";
    case "/settings":
      return "Settings | FluidCalendar";
    case "/setup":
      return "Setup | FluidCalendar";
    case "/auth/signin":
      return "Sign In | FluidCalendar";
    case "/auth/signup":
      return "Sign Up | FluidCalendar";
    case "/auth/reset-password":
      return "Reset Password | FluidCalendar";
    default:
      return "FluidCalendar";
  }
};
