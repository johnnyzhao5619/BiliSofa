/** The shared, minimal KeyManager data surface; no alias enumeration/permissions. */
export interface KeyManagerDataApi {
  saveData(name: string, rawData: string, password: null, success: () => void, error: () => void): void;
  getData(alias: { name: string; packageId?: string }): unknown;
  removeData(alias: { name: string }): void;
}
