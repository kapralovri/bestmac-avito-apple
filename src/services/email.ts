export async function sendEmail(data: Record<string, unknown>) {
  const response = await fetch("https://formsubmit.co/ajax/kapralovri@gmail.com", {
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`Failed to send email: ${response.statusText}`);
  }

  return response.json();
}
