CREATE TABLE public.alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  location_name text NOT NULL,
  district_id text,
  risk_score integer NOT NULL,
  risk_level text NOT NULL,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_action text NOT NULL,
  response_category text NOT NULL,
  scenario text,
  rainfall_mm double precision,
  status text NOT NULL DEFAULT 'active',
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

GRANT SELECT ON public.alerts TO anon;
GRANT SELECT ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prototype alerts are publicly readable" ON public.alerts FOR SELECT USING (true);

CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  district_id text,
  report_type text NOT NULL,
  description text NOT NULL,
  media_path text,
  status text NOT NULL DEFAULT 'pending'
);

GRANT SELECT ON public.reports TO anon;
GRANT SELECT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prototype field reports are publicly readable" ON public.reports FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER alerts_set_updated_at BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER reports_set_updated_at BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX alerts_status_created_idx ON public.alerts (status, created_at DESC);
CREATE INDEX reports_created_idx ON public.reports (created_at DESC);