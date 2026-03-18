import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_API_BASE_URL, loadWellSceneConfig } from '../../api/wellAdmin';
import {
  DEFAULT_WELL_ROUTE_META,
  DEFAULT_WELL_SCENE_CONFIG,
  normalizeWellSceneConfig
} from './wellSceneConfig';

function useWellSceneConfig(apiBaseUrl = DEFAULT_API_BASE_URL) {
  const [config, setConfig] = useState(DEFAULT_WELL_SCENE_CONFIG);
  const [meta, setMeta] = useState(DEFAULT_WELL_ROUTE_META);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await loadWellSceneConfig(apiBaseUrl);
      setConfig(normalizeWellSceneConfig(payload?.config));
      setMeta({
        routes: payload?.routes || DEFAULT_WELL_ROUTE_META.routes,
        consumers: Array.isArray(payload?.consumers) ? payload.consumers : DEFAULT_WELL_ROUTE_META.consumers
      });
      return payload;
    } catch (err) {
      setError('Using local defaults while the shared well API is unavailable.');
      setConfig(DEFAULT_WELL_SCENE_CONFIG);
      setMeta(DEFAULT_WELL_ROUTE_META);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const payload = await loadWellSceneConfig(apiBaseUrl);
        if (!active) return;
        setConfig(normalizeWellSceneConfig(payload?.config));
        setMeta({
          routes: payload?.routes || DEFAULT_WELL_ROUTE_META.routes,
          consumers: Array.isArray(payload?.consumers) ? payload.consumers : DEFAULT_WELL_ROUTE_META.consumers
        });
      } catch (err) {
        if (!active) return;
        setError('Using local defaults while the shared well API is unavailable.');
        setConfig(DEFAULT_WELL_SCENE_CONFIG);
        setMeta(DEFAULT_WELL_ROUTE_META);
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

  return {
    config,
    setConfig,
    meta,
    loading,
    error,
    reload
  };
}

export default useWellSceneConfig;
