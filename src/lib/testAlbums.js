// Albums whose name starts with "test-" are hidden from the rendered site
// unless the URL includes ?test-albums=true. They are still generated and
// published like any other album.

export const TEST_ALBUMS_PARAM = 'test-albums'
export const TEST_ALBUM_PREFIX = 'test-'

export const isTestAlbum = (albumName = '') =>
  albumName.trim().toLowerCase().startsWith(TEST_ALBUM_PREFIX)

export const testAlbumsEnabled = (search = '') =>
  new URLSearchParams(search).get(TEST_ALBUMS_PARAM) === 'true'

export const withTestAlbums = (path, enabled) =>
  enabled ? `${path}?${TEST_ALBUMS_PARAM}=true` : path
