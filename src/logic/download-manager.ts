/* eslint-disable camelcase */
import hashSum from "hash-sum"

/*
.
├── meta/
│   ├── [hash_id_manga]/
│   │   └── [hash_id_ep].mod
│   └── [hash_id_manga].mod
├── files/
│   └── [hash_id_manga]
│       └── [hash_id_ep]
└── poster/
    └── [hash_id_manga]
*/

const DIR_META = "meta"
const DIR_POSTER = "poster"
const DIR_FILES = "files"
const PROTOCOL_OFFLINE = "offline://"

export interface MetaManga {
  readonly path: string

  readonly manga_id: number
  readonly manga_name: string
  readonly manga_image: string
}
export interface MetaMangaOnDisk extends MetaManga {
  readonly start_download_at: number
}
export interface MetaEpisode {
  readonly path: string

  readonly ep_id: number
  readonly ep_name: string

  readonly pages: readonly string[]
}
export interface MetaEpisodeOnDisk extends MetaEpisode {
  readonly downloaded: number
  readonly start_download_at: number
}
export interface MetaEpisodeRunning extends MetaEpisodeOnDisk {
  downloaded: number
  pages: string[]
}

async function downloadFile(src: string, path: string): Promise<void> {
  const buffer = await fetch(src).then((res) => res.arrayBuffer())

  await Filesystem.writeFile({
    path,
    data: uint8ToBase64(new Uint8Array(buffer)),
    directory: Directory.External,
    recursive: true,
  })
}

async function downloadFiles(
  sources: readonly string[],
  hashIDManga: string,
  hashIDEp: string,
  startIndex: number,
  onprogress: (cur: number, total: number, path: string) => boolean
): Promise<void> {
  await someLimit(
    sources,
    async (src: string, index: number) => {
      const path = `${DIR_FILES}/${hashIDManga}/${hashIDEp}/${hashSum(
        startIndex + index
      )}`
      await downloadFile(src, path)

      return onprogress(index, sources.length, PROTOCOL_OFFLINE + path)
    },
    5
  )
}

async function saveMetaManga(metaManga: MetaManga): Promise<MetaMangaOnDisk> {
  const hash_id = hashSum(metaManga.manga_id)

  const path = `${DIR_META}/${hash_id}.mod`

  // check
  try {
    const val = JSON.parse(
      await Filesystem.readFile({
        path,
        directory: Directory.External,
        encoding: Encoding.UTF8,
      }).then((res) => res.data)
    )

    if (val) return val as MetaMangaOnDisk
  } catch {}

  const pathPoster = `${DIR_POSTER}/${hash_id}`
  await downloadFile(metaManga.manga_image, pathPoster)

  const metaOnDisk: MetaMangaOnDisk = {
    ...metaManga,
    manga_image: `${PROTOCOL_OFFLINE}/${pathPoster}`,
    start_download_at: Date.now(),
  }
  await Filesystem.writeFile({
    path,
    directory: Directory.External,
    encoding: Encoding.UTF8,
    data: JSON.stringify(metaOnDisk),
  })

  return metaOnDisk
}

export function createTaskDownloadEpisode(
  metaMannga: MetaManga,
  metaEp: MetaEpisode
) {
  const hashIDEp = hashSum(metaEp.ep_id)

  const downloading = ref(false)
  const refValue = ref<MetaEpisodeRunning>({
    start_download_at: Date.now(),
    downloaded: 0,
    ...metaEp,
    pages: metaEp.pages as string[],
  })

  const startSaveMetaManga = () => saveMetaManga(metaMannga)
  const start = async (loadMetaOnDisk = true) => {
    downloading.value = true
    const hashIDManga = hashSum((await startSaveMetaManga()).manga_id)

    // check continue this passed
    const metaInDisk = loadMetaOnDisk
      ? await Filesystem.readFile({
          path: `${DIR_META}/${hashIDManga}/${hashIDEp}.mod`,
          directory: Directory.External,
          encoding: Encoding.UTF8,
        })
          .then(
            (res) =>
              JSON.parse(res.data) as MetaEpisodeOnDisk & {
                downloaded: number
              }
          )
          .catch(() => undefined)
      : undefined

    // save meta
    const metaCloned = Object.assign(refValue.value, metaInDisk, {
      pages: mergeArray(metaEp.pages, metaInDisk?.pages),
    })

    let timeout: NodeJS.Timeout | number
    const saveMeta = () => {
      return new Promise<void>((resolve, reject) => {
        // delay 1s
        clearTimeout(timeout)

        timeout = setTimeout(async () => {
          try {
            await Filesystem.writeFile({
              path: `${DIR_META}/${hashIDManga}/${hashIDEp}.mod`,
              data: JSON.stringify(metaCloned),
              directory: Directory.External,
              encoding: Encoding.UTF8,
            })
            resolve()
          } catch (err) {
            reject(err)
          }
        }, 1_000)
      })
    }

    if (!downloading.value) return

    const startIndex = metaCloned.downloaded
    // save files
    await downloadFiles(
      metaEp.pages.slice(startIndex),
      hashIDManga,
      hashIDEp,
      startIndex,
      (cur, total, path) => {
        metaCloned.pages[cur + startIndex] = path
        metaCloned.downloaded = cur + startIndex + 1
        saveMeta()
        return !downloading.value
      }
    ).catch(async (err) => {
      await saveMeta()
      downloading.value = false
      // eslint-disable-next-line functional/no-throw-statement
      throw err
    })

    await saveMeta()
    downloading.value = false
  }
  const stop = () => {
    downloading.value = false
  }
  const resume = () => start(false)

  return { ref: refValue, startSaveMetaManga, downloading, start, stop, resume }
}

export async function getListManga() {
  // return
  const { files } = await Filesystem.readdir({
    path: DIR_META,
    directory: Directory.External,
  })

  const list = (
    await Promise.all(
      // eslint-disable-next-line array-callback-return
      files.map((item) => {
        if (item.type === "file")
          return Filesystem.readFile({
            path: `${DIR_META}/${item.name}`,
            directory: Directory.External,
            encoding: Encoding.UTF8,
          }).then((res) => JSON.parse(res.data) as MetaMangaOnDisk)
        // .catch(() => null)
      })
    )
  ).filter(Boolean) as MetaMangaOnDisk[]

  list.sort((a, b) => a.start_download_at - b.start_download_at)

  return list
}

export async function getListEpisodes(manga_id: number) {
  const hashIDManga = hashSum(manga_id)

  const { files } = await Filesystem.readdir({
    path: `${DIR_META}/${hashIDManga}`,
    directory: Directory.External,
  })

  return Promise.all(
    files.map(
      (item) =>
        item.type === "file" &&
        Filesystem.readFile({
          path: `${DIR_META}/${hashIDManga}/${item.name}`,
          directory: Directory.External,
          encoding: Encoding.UTF8,
        }).then((res) => JSON.parse(res.data) as MetaEpisodeOnDisk)
    )
  ).then((list) => list.filter(Boolean) as MetaEpisodeOnDisk[])
}

export async function deleteManga(manga_id: number) {
  const hashIDManga = hashSum(manga_id)

  await Promise.all([
    // remove meta episodes
    Filesystem.rmdir({
      path: `${DIR_META}/${hashIDManga}`,
      directory: Directory.External,
      recursive: true,
    }).catch(() => null),

    // remove meta manga
    Filesystem.deleteFile({
      path: `${DIR_META}/${hashIDManga}.mod`,
      directory: Directory.External,
    }).catch(() => null),

    // remove poster
    Filesystem.deleteFile({
      path: `${DIR_POSTER}/${hashIDManga}`,
      directory: Directory.External,
    }).catch(() => null),

    // remove pages of manga
    Filesystem.rmdir({
      path: `${DIR_FILES}/${hashIDManga}`,
      directory: Directory.External,
      recursive: true,
    }).catch(() => null),
  ])
}

export async function deleteEpisode(manga_id: number, ep_id: number) {
  const hashIDManga = hashSum(manga_id)
  const hashIDEp = hashSum(ep_id)

  await Promise.all([
    // remove meta
    Filesystem.deleteFile({
      path: `${DIR_META}/${hashIDManga}/${hashIDEp}.mod`,
      directory: Directory.External,
    })
      .then(async () => {
        // check removed all episode
        const { files } = await Filesystem.readdir({
          path: `${DIR_META}/${hashIDManga}`,
          directory: Directory.External,
        })

        if (files.length === 0) {
          // remove poster and meta manga
          await Promise.all([
            // remove poster
            Filesystem.deleteFile({
              path: `${DIR_POSTER}/${hashIDManga}`,
              directory: Directory.External,
              // eslint-disable-next-line promise/no-nesting
            }).catch(() => null),
            // remove meta manga
            Filesystem.deleteFile({
              path: `${DIR_META}/${hashIDManga}.mod`,
              directory: Directory.External,
              // eslint-disable-next-line promise/no-nesting
            }).catch(() => null),
          ])
        }

        // eslint-disable-next-line no-useless-return
        return
      })
      .catch(() => null),

    // remove pages
    Filesystem.rmdir({
      path: `${DIR_FILES}/${hashIDManga}/${hashIDEp}`,
      directory: Directory.External,
      recursive: true,
    })
      .then(async () => {
        // check removed all episode
        const { files } = await Filesystem.readdir({
          path: `${DIR_FILES}/${hashIDManga}`,
          directory: Directory.External,
        })

        if (files.length === 0) {
          await Filesystem.rmdir({
            path: `${DIR_FILES}/${hashIDManga}`,
            directory: Directory.External,
            recursive: true,
          })
        }

        // eslint-disable-next-line no-useless-return
        return
      })
      .catch(() => null),
  ])
}
