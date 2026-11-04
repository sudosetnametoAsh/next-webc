-- Student enrollment no longer collects phone numbers.
ALTER TABLE public.students DROP COLUMN IF EXISTS phone_number;
