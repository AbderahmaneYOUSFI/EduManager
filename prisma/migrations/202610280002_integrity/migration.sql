CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Room" ADD CONSTRAINT "room_capacity_positive" CHECK (capacity > 0);
ALTER TABLE "Group" ADD CONSTRAINT "group_values_positive" CHECK (capacity > 0 AND "monthlyPrice" > 0);
ALTER TABLE "Subscription" ADD CONSTRAINT "subscription_values" CHECK ("agreedAmount" > 0 AND "dueDay" = 10);
ALTER TABLE "Enrollment" ADD CONSTRAINT "enrollment_dates" CHECK ("endsOn" IS NULL OR "endsOn" >= "startsOn");
ALTER TABLE "Enrollment" ADD CONSTRAINT "enrollment_no_overlap" EXCLUDE USING gist ("studentId" WITH =, "groupId" WITH =, daterange("startsOn", "endsOn", '[]') WITH &&);
ALTER TABLE "MonthlyCharge" ADD CONSTRAINT "charge_values" CHECK (amount > 0 AND period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND "dueOn" = (period || '-10')::date);
ALTER TABLE "Payment" ADD CONSTRAINT "payment_values" CHECK (amount > 0 AND method IN ('CASH', 'TRANSFER', 'CHEQUE'));
ALTER TABLE "Payment" ADD CONSTRAINT "cancellation_trace" CHECK ((status = 'VALIDATED' AND "cancelledAt" IS NULL AND "cancelledById" IS NULL AND "cancelReason" IS NULL) OR (status = 'CANCELLED' AND "cancelledAt" IS NOT NULL AND "cancelledById" IS NOT NULL AND length(trim("cancelReason")) >= 5));
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "allocation_positive" CHECK (amount > 0);
ALTER TABLE "ClassSession" ADD CONSTRAINT "session_dates" CHECK ("endsAt" > "startsAt" AND "endsAt" <= "startsAt" + interval '12 hours');
ALTER TABLE "ClassSession" ADD CONSTRAINT "session_room_no_overlap" EXCLUDE USING gist ("roomId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&) WHERE (status <> 'CANCELLED');
ALTER TABLE "ClassSession" ADD CONSTRAINT "session_teacher_no_overlap" EXCLUDE USING gist ("teacherId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&) WHERE (status <> 'CANCELLED');
ALTER TABLE "ClassSession" ADD CONSTRAINT "session_group_no_overlap" EXCLUDE USING gist ("groupId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&) WHERE (status <> 'CANCELLED');

CREATE FUNCTION deny_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Immutable ledger or audit record'; END $$;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION deny_mutation();
CREATE TRIGGER charge_immutable BEFORE UPDATE OR DELETE ON "MonthlyCharge" FOR EACH ROW EXECUTE FUNCTION deny_mutation();
CREATE TRIGGER allocation_immutable BEFORE UPDATE OR DELETE ON "PaymentAllocation" FOR EACH ROW EXECUTE FUNCTION deny_mutation();
CREATE TRIGGER payment_no_delete BEFORE DELETE ON "Payment" FOR EACH ROW EXECUTE FUNCTION deny_mutation();

CREATE FUNCTION protect_payment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'VALIDATED' OR NEW.status <> 'CANCELLED' OR
     (to_jsonb(OLD) - ARRAY['status','cancelledAt','cancelledById','cancelReason']) IS DISTINCT FROM
     (to_jsonb(NEW) - ARRAY['status','cancelledAt','cancelledById','cancelReason']) THEN
    RAISE EXCEPTION 'Only traced payment cancellation is permitted';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER payment_immutable BEFORE UPDATE ON "Payment" FOR EACH ROW EXECUTE FUNCTION protect_payment();

CREATE FUNCTION check_payment_totals() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE payment_id uuid; target "Payment"%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME = 'Payment' THEN payment_id := NEW.id; ELSE payment_id := NEW."paymentId"; END IF;
  SELECT * INTO target FROM "Payment" WHERE id = payment_id;
  IF target.amount <> COALESCE((SELECT sum(amount) FROM "PaymentAllocation" WHERE "paymentId" = payment_id), 0) THEN RAISE EXCEPTION 'Unbalanced payment'; END IF;
  IF EXISTS (
    SELECT 1 FROM "PaymentAllocation" a
    JOIN "MonthlyCharge" c ON c.id = a."chargeId"
    JOIN "Subscription" s ON s.id = c."subscriptionId"
    JOIN "Enrollment" e ON e.id = s."enrollmentId"
    WHERE a."paymentId" = payment_id AND e."studentId" <> target."studentId"
  ) THEN RAISE EXCEPTION 'Allocation belongs to another student'; END IF;
  IF EXISTS (
    SELECT c.id FROM "MonthlyCharge" c JOIN "PaymentAllocation" a ON a."chargeId" = c.id
    JOIN "Payment" p ON p.id = a."paymentId" AND p.status = 'VALIDATED'
    WHERE c.id IN (SELECT "chargeId" FROM "PaymentAllocation" WHERE "paymentId" = payment_id)
    GROUP BY c.id HAVING sum(a.amount) > c.amount
  ) THEN RAISE EXCEPTION 'Overallocated charge'; END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER payment_totals AFTER INSERT OR UPDATE ON "Payment" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_payment_totals();
CREATE CONSTRAINT TRIGGER allocation_totals AFTER INSERT ON "PaymentAllocation" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_payment_totals();

CREATE FUNCTION protect_subscription() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."agreedAmount" <> OLD."agreedAmount" OR NEW."enrollmentId" <> OLD."enrollmentId" THEN RAISE EXCEPTION 'Historical subscription terms are immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER subscription_terms BEFORE UPDATE ON "Subscription" FOR EACH ROW EXECUTE FUNCTION protect_subscription();
