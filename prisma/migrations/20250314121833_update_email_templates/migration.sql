-- Update email templates to use FluidCalendar instead of Fluid Calendar
UPDATE "BetaSettings"
SET 
  "invitationEmailTemplate" = REPLACE("invitationEmailTemplate", 'Fluid Calendar', 'FluidCalendar'),
  "waitlistConfirmationTemplate" = REPLACE("waitlistConfirmationTemplate", 'Fluid Calendar', 'FluidCalendar'),
  "reminderEmailTemplate" = REPLACE("reminderEmailTemplate", 'Fluid Calendar', 'FluidCalendar')
WHERE "id" = 'default'; 