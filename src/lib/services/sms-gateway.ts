export default async function smsGateWay({
  phone_number,
  department,
}: {
  phone_number: string;
  department: string;
}) {
  // SMS is optional and must not hold background work open indefinitely.
  if (!process.env.LOCAL_IP || !process.env.SMS_USERNAME || !process.env.SMS_PASSWORD) return;
  try {
    const credentials = Buffer.from(
      `${process.env.SMS_USERNAME}:${process.env.SMS_PASSWORD}`,
    ).toString("base64");

    const response = await fetch(`${process.env.LOCAL_IP}/messages`, {
      method: "POST",
      signal: AbortSignal.timeout(5000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        phoneNumbers: [phone_number],
        textMessage: {
          text: `Your clearance for ${department} has been signed.`,
        },
      }),
    });
    if (!response.ok) throw new Error(`SMS gateway returned ${response.status}`);
  } catch (error) {
    if (error instanceof Error)
      console.error("Error occured posting to gateway: ", error.message);
    return;
  }
}
