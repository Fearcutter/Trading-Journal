import { useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { DEFAULT_PROP_FIRMS } from '../../constants/prop-firms';
import type { FirmConfig } from '../../utils/prop-ev';

/** The firm list with the user's saved edits applied. */
export function usePropFirms(): FirmConfig[] {
  const { propFirmOverrides } = useSettings();
  return useMemo(() => DEFAULT_PROP_FIRMS.map(f => propFirmOverrides?.[f.id] ?? f), [propFirmOverrides]);
}

export const firmLabel = (f: Pick<FirmConfig, 'firm' | 'plan' | 'size'>) => `${f.firm} ${f.plan} ${f.size / 1000}K`;
