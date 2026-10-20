CREATE OR REPLACE FUNCTION public.get_reproducao_report_summary(p_data_especifica date DEFAULT NULL::date, p_data_inicio date DEFAULT NULL::date, p_data_fim date DEFAULT NULL::date, p_touro text DEFAULT NULL::text, p_protocolo text DEFAULT NULL::text, p_resultado_dg text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_categoria text DEFAULT NULL::text)
 RETURNS TABLE(total_count bigint, touros_count bigint, prenhas_count bigint, vazias_count bigint, aguardando_count bigint, iatf_count bigint, datas_com_registros text[], touros text[])
 LANGUAGE sql
 STABLE
AS $function$
  WITH filtrados AS (
    SELECT
      e.data_principal,
      e.tipo_protocolo,
      e.resultado_dg,
      NULLIF(BTRIM(e.dados_protocolo ->> 'touro'), '') AS touro,
      e.brinco_matriz
    FROM public.eventos_reproducao e
    WHERE (p_data_especifica IS NULL OR e.data_principal = p_data_especifica)
      AND (p_data_inicio IS NULL OR e.data_principal >= p_data_inicio)
      AND (p_data_fim IS NULL OR e.data_principal <= p_data_fim)
      AND (p_touro IS NULL OR p_touro = '' OR (e.dados_protocolo ->> 'touro') = p_touro)
      AND (p_protocolo IS NULL OR p_protocolo = '' OR p_protocolo = 'all' OR e.tipo_protocolo = p_protocolo)
      AND (
        p_resultado_dg IS NULL OR p_resultado_dg = '' OR p_resultado_dg = 'all'
        OR (p_resultado_dg = 'pendente' AND e.resultado_dg IS NULL)
        OR (p_resultado_dg <> 'pendente' AND e.resultado_dg = p_resultado_dg)
      )
      AND (
        p_categoria IS NULL OR p_categoria = '' OR p_categoria = 'all'
        OR EXISTS (
          SELECT 1 FROM public.animais a
          WHERE a.id = e.animal_id AND a.categoria = p_categoria
        )
      )
      AND (
        p_search IS NULL OR p_search = ''
        OR e.brinco_matriz ILIKE '%' || p_search || '%'
        OR (e.dados_protocolo ->> 'touro') ILIKE '%' || p_search || '%'
      )
  )
  SELECT
    COUNT(*)::bigint,
    COUNT(DISTINCT touro)::bigint,
    COUNT(*) FILTER (WHERE resultado_dg = 'cheia')::bigint,
    COUNT(*) FILTER (WHERE resultado_dg = 'vazia')::bigint,
    COUNT(*) FILTER (WHERE resultado_dg IS NULL)::bigint,
    COUNT(*) FILTER (WHERE tipo_protocolo = 'iatf')::bigint,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT data_principal::text ORDER BY data_principal::text DESC), NULL),
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT touro ORDER BY touro), NULL)
  FROM filtrados;
$function$;