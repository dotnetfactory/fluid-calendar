-- Update existing waitlist entries with unique referral codes
-- This uses a PostgreSQL-specific function to generate UUIDs and takes the first 8 characters for referral codes
UPDATE "Waitlist"
SET "referralCode" = SUBSTRING(gen_random_uuid()::text, 1, 8),
    "status" = COALESCE("status", 'WAITING'),
    "priorityScore" = COALESCE("priorityScore", 0),
    "referralCount" = COALESCE("referralCount", 0);

-- Insert default BetaSettings if it doesn't exist
INSERT INTO "BetaSettings" ("id", "invitationEmailTemplate", "waitlistConfirmationTemplate", "reminderEmailTemplate")
VALUES ('default', 
'<h1>You''re Invited to Join FluidCalendar Beta!</h1>
<p>Hi {{name}},</p>
<p>We''re excited to invite you to join the FluidCalendar beta program! Your spot is now available.</p>
<p>Click the button below to create your account and start using FluidCalendar:</p>
<a href="{{invitationLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Join the Beta</a>
<p>This invitation will expire on {{expirationDate}}.</p>
<p>Thank you for your interest in FluidCalendar!</p>',

'<h1>You''re on the FluidCalendar Waitlist!</h1>
<p>Hi {{name}},</p>
<p>Thank you for joining the FluidCalendar waitlist! We''ll notify you when your spot is available.</p>
<p>Your current position: {{position}}</p>
<p>Want to move up the list? Share your referral link with friends:</p>
<p><strong>{{referralLink}}</strong></p>
<p>Each person who joins using your link will help you move up in the queue!</p>
<p>Check your current status anytime:</p>
<a href="{{statusLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Check Status</a>
<p>Thank you for your interest in FluidCalendar!</p>',

'<h1>Your FluidCalendar Invitation is Expiring Soon!</h1>
<p>Hi {{name}},</p>
<p>This is a friendly reminder that your invitation to join the FluidCalendar beta will expire on {{expirationDate}}.</p>
<p>Don''t miss out on being one of our early users!</p>
<a href="{{invitationLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Join Now</a>
<p>Thank you for your interest in FluidCalendar!</p>')
ON CONFLICT ("id") DO NOTHING;

-- Now that we've populated the required fields, we can make them required and unique
ALTER TABLE "Waitlist" ALTER COLUMN "referralCode" SET NOT NULL;
ALTER TABLE "Waitlist" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "Waitlist" ALTER COLUMN "priorityScore" SET NOT NULL;
ALTER TABLE "Waitlist" ALTER COLUMN "referralCount" SET NOT NULL;

-- Add unique constraints
CREATE UNIQUE INDEX "Waitlist_referralCode_key" ON "Waitlist"("referralCode");

-- Add additional indexes
CREATE INDEX "Waitlist_referralCode_idx" ON "Waitlist"("referralCode");