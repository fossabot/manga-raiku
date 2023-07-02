import { parseComment } from "../__helpers__/parseComment"
import { parseDom } from "../__helpers__/parseDom"

export default function chap(html: string, now: number) {
  const $ = parseDom(html)
  // ====================
  const updated = new Date(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    $(".detail-title").next("time").attr("datetime")!
  ).getTime()
  const pages = $(".page-chapter img")
    .toArray()
    .map((page) => {
      const $page = $(page)
      return {
        src: $page.attr("src"),
        original: $page.attr("data-original"),
        cdn: $page.attr("data-cdn"),
      }
    })

  const comments = $(".info-comment")
    .toArray()
    .map((item) => parseComment($(item), now))

  return { updated, pages, comments }
}

const replaceHosts = {
  "mangaqq.net": "i200.truyenvua.com",
  "cdnqq.xyz": "i200.truyenvua.com",
  "mangaqq.com": "i216.truyenvua.com",
  "photruyen.com": "i109.truyenvua.com",
  "tintruyen.com": "i109.truyenvua.com",
  "trangshop.net": "i109.truyenvua.com",
  "tintruyen.net": "i138.truyenvua.com",
  "i125.tintruyen.net": "i125.truyenvua.com",
  "qqtaku.com": "i125.truyenvua.com",
}
export const SERVERS: {
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  has: (item: any) => boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: (item: any) => string
}[] = [
  {
    name: "Server 1",
    has: () => true,
    get: (item) => item.src,
  },
  {
    name: "Server 2",
    has: (item) => item.original !== null,
    get: (item) => item.original,
  },
  {
    name: "Server 2",
    has: () => true,
    get: (item) =>
      `https://images2-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&gadget=a&no_expand=1&resize_h=0&rewriteMime=image%2F*&url=${encodeURIComponent(
        item.src
      )}`,
  },
  {
    name: "Server 3",
    has: (item) => {
      // eslint-disable-next-line functional/no-loop-statements
      for (const host in replaceHosts) {
        if (item.cdn.includes(host)) return true
      }
      return false
    },
    get: (item) => {
      // eslint-disable-next-line functional/no-loop-statements
      for (const host in replaceHosts) {
        if (item.original.includes(host))
          return item.original.replace(host, replaceHosts[host as keyof typeof replaceHosts])
      }
      return item.original
    },
  },
  {
    name: "Server 4",
    has: (item) => item.cdn !== null,
    get: (item) => item.cdn,
  },
]