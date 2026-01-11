import { QueryInterface, QueryTypes, Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

// Template definitions with high-conversion luxury marketing content
const templateDefinitions = {
  welcome: {
    name: 'Welcome Email',
    subject: 'Welcome to our world, {{firstName}}',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #252525; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #2a2a2a; padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-family: Inter, sans-serif; font-size: 28px; font-weight: 600;">Welcome to Our World</h1>
  </div>
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-bottom: 24px; font-family: Inter, sans-serif; color: #252525;">Hi {{firstName}},</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">You've just stepped into a space where artistry meets intention — where every piece is shaped by craftsmanship, emotion, and modern luxury. We're honored to have you here.</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">This is more than a brand. It's a quiet rebellion against the ordinary — designed for individuals who move with purpose and style.</p>
    <p style="margin-bottom: 30px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">Your journey begins now. Let's make it unforgettable.</p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="#" style="background: #2a2a2a; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Inter, sans-serif; font-weight: 500; font-size: 16px;">Explore the Collection</a>
    </div>
  </div>
</body>
</html>`,
    textContent: `Hi {{firstName}},

You've just stepped into a space where artistry meets intention — where every piece is shaped by craftsmanship, emotion, and modern luxury. We're honored to have you here.

This is more than a brand. It's a quiet rebellion against the ordinary — designed for individuals who move with purpose and style.

Your journey begins now. Let's make it unforgettable.

Explore the Collection: [Link]`,
  },
  newsletter: {
    name: 'Monthly Newsletter',
    subject: 'Your weekly inspiration awaits, {{firstName}}',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #252525; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f5f5f5; padding: 40px; border-radius: 10px;">
    <h1 style="color: #2a2a2a; margin-top: 0; font-family: Inter, sans-serif; font-size: 28px; font-weight: 600;">Your Weekly Inspiration</h1>
    <p style="font-size: 18px; margin-bottom: 24px; font-family: Inter, sans-serif; color: #252525;">Hi {{firstName}},</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">This is your private dispatch into what's shaping the mood of the season — emerging silhouettes, tonal palettes, backstage stories, and new creative movements.</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">Think of this as a curated moment of escape — crafted to inspire what comes next in your world.</p>
    <p style="margin-bottom: 30px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">Let's dive in.</p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="#" style="background: #2a2a2a; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Inter, sans-serif; font-weight: 500; font-size: 16px;">Read the Latest Edition</a>
    </div>
  </div>
</body>
</html>`,
    textContent: `Hi {{firstName}},

This is your private dispatch into what's shaping the mood of the season — emerging silhouettes, tonal palettes, backstage stories, and new creative movements.

Think of this as a curated moment of escape — crafted to inspire what comes next in your world.

Let's dive in.

Read the Latest Edition: [Link]`,
  },
  promotion: {
    name: 'Special Promotion',
    subject: 'An exclusive offer crafted for you, {{firstName}}',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Special Promotion</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #252525; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #2a2a2a; padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-family: Inter, sans-serif; font-weight: 600;">Exclusive Offer</h1>
  </div>
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-bottom: 24px; font-family: Inter, sans-serif; color: #252525;">Hi {{firstName}},</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">For a limited time, you're invited to unlock preferred pricing on select signature pieces — timeless essentials that elevate every moment.</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">Exceptional craftsmanship, limited quantities, and an invitation few receive.</p>
    <p style="margin-bottom: 30px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8; font-style: italic;">When something speaks to you… answer.</p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="#" style="background: #2a2a2a; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Inter, sans-serif; font-weight: 500; font-size: 16px;">Access the Offer</a>
    </div>
  </div>
</body>
</html>`,
    textContent: `Hi {{firstName}},

For a limited time, you're invited to unlock preferred pricing on select signature pieces — timeless essentials that elevate every moment.

Exceptional craftsmanship, limited quantities, and an invitation few receive.

When something speaks to you… answer.

Access the Offer: [Link]`,
  },
  notification: {
    name: 'Important Notification',
    subject: 'We wanted you to know first, {{firstName}}',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notification</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #252525; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #2a2a2a; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-family: Inter, sans-serif; font-size: 24px; font-weight: 600;">Important Update</h1>
  </div>
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-bottom: 24px; font-family: Inter, sans-serif; color: #252525;">Hi {{firstName}},</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">Here's a quick update about your experience with us — improvements designed to create a smoother, faster, and more intuitive journey.</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">Your time matters. Your experience matters. Thank you for being part of what we're building.</p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="#" style="background: #2a2a2a; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Inter, sans-serif; font-weight: 500; font-size: 16px;">View Update</a>
    </div>
  </div>
</body>
</html>`,
    textContent: `Hi {{firstName}},

Here's a quick update about your experience with us — improvements designed to create a smoother, faster, and more intuitive journey.

Your time matters. Your experience matters. Thank you for being part of what we're building.

View Update: [Link]`,
  },
  'follow-up': {
    name: 'Follow-up Email',
    subject: 'Still thinking about it, {{firstName}}?',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Follow-up</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #252525; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-radius: 10px;">
    <p style="font-size: 18px; margin-bottom: 24px; font-family: Inter, sans-serif; color: #252525;">Hi {{firstName}},</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">The piece you explored recently hasn't left our mind — and something tells us it hasn't left yours either. We've held it aside, just in case it's meant to be part of your story.</p>
    <p style="margin-bottom: 30px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8; font-style: italic;">Some pieces are more than style — they're connection.</p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="#" style="background: #2a2a2a; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Inter, sans-serif; font-weight: 500; font-size: 16px;">Return to Your Selection</a>
    </div>
  </div>
</body>
</html>`,
    textContent: `Hi {{firstName}},

The piece you explored recently hasn't left our mind — and something tells us it hasn't left yours either. We've held it aside, just in case it's meant to be part of your story.

Some pieces are more than style — they're connection.

Return to Your Selection: [Link]`,
  },
  reminder: {
    name: 'Reminder Email',
    subject: 'Last chance to claim this moment, {{firstName}}',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reminder</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #252525; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f5f5f5; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; border-left: 4px solid #2a2a2a;">
    <h1 style="color: #2a2a2a; margin: 0; font-family: Inter, sans-serif; font-size: 24px; font-weight: 600;">Last Chance</h1>
  </div>
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-bottom: 24px; font-family: Inter, sans-serif; color: #252525;">Hi {{firstName}},</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">Time is running out — and we'd hate for you to miss something that feels like it belongs to you. Once this window closes, it won't reopen.</p>
    <p style="margin-bottom: 30px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8; font-weight: 500;">If it's calling you… move now.</p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="#" style="background: #2a2a2a; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Inter, sans-serif; font-weight: 500; font-size: 16px;">Secure It Now</a>
    </div>
  </div>
</body>
</html>`,
    textContent: `Hi {{firstName}},

Time is running out — and we'd hate for you to miss something that feels like it belongs to you. Once this window closes, it won't reopen.

If it's calling you… move now.

Secure It Now: [Link]`,
  },
  'thank-you': {
    name: 'Thank You Email',
    subject: 'Thank you, {{firstName}}',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #252525; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #2a2a2a; padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-family: Inter, sans-serif; font-weight: 600;">Thank You</h1>
  </div>
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-bottom: 24px; font-family: Inter, sans-serif; color: #252525;">Hi {{firstName}},</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">Thank you for choosing us — for supporting craftsmanship, creativity, and slow fashion built to last. Your trust fuels what we create and why we create it.</p>
    <p style="margin-bottom: 30px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">We're grateful you're here.</p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="#" style="background: #2a2a2a; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Inter, sans-serif; font-weight: 500; font-size: 16px;">Explore What's Next</a>
    </div>
  </div>
</body>
</html>`,
    textContent: `Hi {{firstName}},

Thank you for choosing us — for supporting craftsmanship, creativity, and slow fashion built to last. Your trust fuels what we create and why we create it.

We're grateful you're here.

Explore What's Next: [Link]`,
  },
  invitation: {
    name: 'Event Invitation',
    subject: 'A private invitation for you, {{firstName}}',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #252525; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #2a2a2a; padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-family: Inter, sans-serif; font-size: 28px; font-weight: 600;">You're Invited</h1>
  </div>
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-bottom: 24px; font-family: Inter, sans-serif; color: #252525;">Hi {{firstName}},</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">You're personally invited to an intimate preview of our newest capsule collection — a cinematic experience celebrating artistry, texture, and design evolution.</p>
    <p style="margin-bottom: 30px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">We'd be honored to host you.</p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="#" style="background: #2a2a2a; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Inter, sans-serif; font-weight: 500; font-size: 16px;">Reserve Your Spot</a>
    </div>
  </div>
</body>
</html>`,
    textContent: `Hi {{firstName}},

You're personally invited to an intimate preview of our newest capsule collection — a cinematic experience celebrating artistry, texture, and design evolution.

We'd be honored to host you.

Reserve Your Spot: [Link]`,
  },
  announcement: {
    name: 'Announcement Email',
    subject: "It's finally here, {{firstName}}",
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Announcement</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #252525; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #2a2a2a; padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-family: Inter, sans-serif; font-weight: 600;">It's Finally Here</h1>
  </div>
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-bottom: 24px; font-family: Inter, sans-serif; color: #252525;">Hi {{firstName}},</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">Today marks a defining moment — the release of our newest collection, created to challenge form, movement, and modern luxury.</p>
    <p style="margin-bottom: 30px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">Be among the first to experience the reveal.</p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="#" style="background: #2a2a2a; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Inter, sans-serif; font-weight: 500; font-size: 16px;">Experience the Launch</a>
    </div>
  </div>
</body>
</html>`,
    textContent: `Hi {{firstName}},

Today marks a defining moment — the release of our newest collection, created to challenge form, movement, and modern luxury.

Be among the first to experience the reveal.

Experience the Launch: [Link]`,
  },
  survey: {
    name: 'Survey Request',
    subject: 'Your perspective matters, {{firstName}}',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Survey</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #252525; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #2a2a2a; padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-family: Inter, sans-serif; font-size: 24px; font-weight: 600;">Your Perspective Matters</h1>
  </div>
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-bottom: 24px; font-family: Inter, sans-serif; color: #252525;">Hi {{firstName}},</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">We're shaping the next chapter — and we'd love to build it with you. Your insights guide how we design, refine, and evolve.</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">It takes just a moment. It means everything.</p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="#" style="background: #2a2a2a; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Inter, sans-serif; font-weight: 500; font-size: 16px;">Share Your Feedback</a>
    </div>
  </div>
</body>
</html>`,
    textContent: `Hi {{firstName}},

We're shaping the next chapter — and we'd love to build it with you. Your insights guide how we design, refine, and evolve.

It takes just a moment. It means everything.

Share Your Feedback: [Link]`,
  },
  onboarding: {
    name: 'Onboarding Email',
    subject: "Let's get you started, {{firstName}}",
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Onboarding</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #252525; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #2a2a2a; padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-family: Inter, sans-serif; font-size: 28px; font-weight: 600;">Let's Get You Started</h1>
  </div>
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-bottom: 24px; font-family: Inter, sans-serif; color: #252525;">Hi {{firstName}},</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">We've created a simple path to help you unlock the most from your experience with us — from personalization to early access and curated edits.</p>
    <p style="margin-bottom: 30px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">You're in good hands.</p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="#" style="background: #2a2a2a; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Inter, sans-serif; font-weight: 500; font-size: 16px;">Begin Now</a>
    </div>
  </div>
</body>
</html>`,
    textContent: `Hi {{firstName}},

We've created a simple path to help you unlock the most from your experience with us — from personalization to early access and curated edits.

You're in good hands.

Begin Now: [Link]`,
  },
  support: {
    name: 'Support Response',
    subject: "We're here to help, {{firstName}}",
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #252525; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #2a2a2a; padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-family: Inter, sans-serif; font-size: 24px; font-weight: 600;">We're Here to Help</h1>
  </div>
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-bottom: 24px; font-family: Inter, sans-serif; color: #252525;">Hi {{firstName}},</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">Your request has been received, and our team is already on it. Expect thoughtful guidance and a swift resolution.</p>
    <p style="margin-bottom: 30px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">Thank you for your patience and trust.</p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="#" style="background: #2a2a2a; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Inter, sans-serif; font-weight: 500; font-size: 16px;">Track Request</a>
    </div>
  </div>
</body>
</html>`,
    textContent: `Hi {{firstName}},

Your request has been received, and our team is already on it. Expect thoughtful guidance and a swift resolution.

Thank you for your patience and trust.

Track Request: [Link]`,
  },
  sales: {
    name: 'Sales Email',
    subject: 'The private sale begins now, {{firstName}}',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sales</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #252525; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #2a2a2a; padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-family: Inter, sans-serif; font-size: 28px; font-weight: 600;">Private Sale</h1>
  </div>
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-bottom: 24px; font-family: Inter, sans-serif; color: #252525;">Hi {{firstName}},</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">Our most anticipated private sale is now open — limited quantities, signature pieces, and exclusive access before the public.</p>
    <p style="margin-bottom: 30px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8; font-style: italic;">A rare opportunity. A moment worth taking.</p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="#" style="background: #2a2a2a; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Inter, sans-serif; font-weight: 500; font-size: 16px;">Shop the Sale</a>
    </div>
  </div>
</body>
</html>`,
    textContent: `Hi {{firstName}},

Our most anticipated private sale is now open — limited quantities, signature pieces, and exclusive access before the public.

A rare opportunity. A moment worth taking.

Shop the Sale: [Link]`,
  },
  marketing: {
    name: 'Marketing Campaign',
    subject: 'The new season is taking shape, {{firstName}}',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Marketing</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #252525; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #2a2a2a; padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-family: Inter, sans-serif; font-size: 28px; font-weight: 600;">The New Season</h1>
  </div>
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-bottom: 24px; font-family: Inter, sans-serif; color: #252525;">Hi {{firstName}},</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">This season, we're exploring form, movement, and emotion through design — pieces that elevate the everyday and challenge the ordinary.</p>
    <p style="margin-bottom: 30px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">Step into the new perspective.</p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="#" style="background: #2a2a2a; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Inter, sans-serif; font-weight: 500; font-size: 16px;">Explore the Vision</a>
    </div>
  </div>
</body>
</html>`,
    textContent: `Hi {{firstName}},

This season, we're exploring form, movement, and emotion through design — pieces that elevate the everyday and challenge the ordinary.

Step into the new perspective.

Explore the Vision: [Link]`,
  },
  event: {
    name: 'Event Email',
    subject: 'See you there, {{firstName}}?',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #252525; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #2a2a2a; padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-family: Inter, sans-serif; font-size: 28px; font-weight: 600;">Join Us</h1>
  </div>
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-bottom: 24px; font-family: Inter, sans-serif; color: #252525;">Hi {{firstName}},</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">Join us for an unforgettable evening celebrating design, culture, and artistry — a curated experience created for those who appreciate beauty in detail.</p>
    <p style="margin-bottom: 30px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">A night to remember awaits.</p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="#" style="background: #2a2a2a; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Inter, sans-serif; font-weight: 500; font-size: 16px;">Confirm Attendance</a>
    </div>
  </div>
</body>
</html>`,
    textContent: `Hi {{firstName}},

Join us for an unforgettable evening celebrating design, culture, and artistry — a curated experience created for those who appreciate beauty in detail.

A night to remember awaits.

Confirm Attendance: [Link]`,
  },
  're-engagement': {
    name: 'Re-engagement Email',
    subject: "We've missed you, {{firstName}}",
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Re-engagement</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #252525; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #2a2a2a; padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-family: Inter, sans-serif; font-size: 28px; font-weight: 600;">We've Missed You</h1>
  </div>
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-bottom: 24px; font-family: Inter, sans-serif; color: #252525;">Hi {{firstName}},</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">It's been a while — and we'd love to reconnect. Much has evolved: new textures, new stories, and new pieces waiting to be discovered.</p>
    <p style="margin-bottom: 30px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">Come back and see what's changed.</p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="#" style="background: #2a2a2a; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Inter, sans-serif; font-weight: 500; font-size: 16px;">Return to Explore</a>
    </div>
  </div>
</body>
</html>`,
    textContent: `Hi {{firstName}},

It's been a while — and we'd love to reconnect. Much has evolved: new textures, new stories, and new pieces waiting to be discovered.

Come back and see what's changed.

Return to Explore: [Link]`,
  },
  other: {
    name: 'General Email',
    subject: 'A message just for you, {{firstName}}',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>General Email</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #252525; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #2a2a2a; padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-family: Inter, sans-serif; font-size: 24px; font-weight: 600;">A Message for You</h1>
  </div>
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-bottom: 24px; font-family: Inter, sans-serif; color: #252525;">Hi {{firstName}},</p>
    <p style="margin-bottom: 20px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">We wanted to share something meaningful — created specifically with you in mind. This is the beginning of something special.</p>
    <p style="margin-bottom: 30px; font-family: Inter, sans-serif; color: #252525; line-height: 1.8;">More soon. Stay close.</p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="#" style="background: #2a2a2a; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Inter, sans-serif; font-weight: 500; font-size: 16px;">Learn More</a>
    </div>
  </div>
</body>
</html>`,
    textContent: `Hi {{firstName}},

We wanted to share something meaningful — created specifically with you in mind. This is the beginning of something special.

More soon. Stay close.

Learn More: [Link]`,
  },
};

export default {
  up: async (queryInterface: QueryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      const now = new Date();
      const templates = [];

      // Create system templates
      for (const [category, template] of Object.entries(templateDefinitions)) {
        templates.push({
          id: uuidv4(),
          name: template.name,
          category: category,
          subject: template.subject,
          html_content: template.htmlContent,
          text_content: template.textContent,
          variables: JSON.stringify(['firstName']),
          created_at: now,
          updated_at: now,
        });
      }

      if (templates.length > 0) {
        await queryInterface.bulkInsert('system_templates', templates, { transaction });
        console.log(`Seeded ${templates.length} system templates.`);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('Error seeding system templates:', error);
      throw error;
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Delete all system templates
      await queryInterface.bulkDelete('system_templates', {}, { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('Error rolling back system templates seeder:', error);
      throw error;
    }
  },
};
