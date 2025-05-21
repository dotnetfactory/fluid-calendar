/**
 * Client service to call the backend password setup API for new lifetime users.
 * @param params - Object containing name, email, and password
 * @returns Promise with API response
 */
export async function setupPassword({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) {
  const res = await fetch("/subscription/lifetime/setup-password/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to set up password");
  }
  return res.json();
}
