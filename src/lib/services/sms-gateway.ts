export default async function smsGateWay({
  phone_number,
  department,
}: {
  phone_number: string;
  department: string;
}) {
  try {
    const credentials = Buffer.from(
      `${process.env.SMS_USERNAME}:${process.env.SMS_PASSWORD}`,
    ).toString("base64");

    await fetch(`${process.env.LOCAL_IP}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        phoneNumbers: [phone_number],
        textMessage: {
          text: `Your clearance on the ${department} department has been signed`,
        },
      }),
    });
  } catch (error) {
    if (error instanceof Error)
      console.error("Error occured posting to gateway: ", error.message);
    return;
  }
}
