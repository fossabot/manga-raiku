import type { Cheerio, CheerioAPI, Element } from "cheerio"

import { parseAnchor } from "./parseAnchor"
import { parsePath } from "./parsePath"
import { parseTimeAgo } from "./parseTimeAgo"

export function parseItem($: CheerioAPI, $li: Cheerio<Element>, now: number) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const path = parsePath($li.find("a").attr("href")!)
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const image = $li.find("img").attr("src")!
  const name = $li.find(".book_name").text().trim()
  // eslint-disable-next-line camelcase
  const last_chapter = parseAnchor($li.find(".last_chapter > a"))
  const updated = parseTimeAgo($li.find(".time-ago").text().trim(), now)
  const label = $li.find(".type-label").text().trim() // "Hot" // "Label"

  const $info = $li.find(".more-info .info")
  const status =
    $info.length === 0 ? null : $info.eq(0).text().replace("Tình trạng: ", "")
  const views =
    $info.length === 0
      ? null
      : parseInt(
          $info.eq(1).text().trim().replace("Lượt xem: ", "").replace(/,/g, "")
        )
  const follows =
    $info.length === 0
      ? null
      : parseInt(
          $info
            .eq(2)
            .text()
            .trim()
            .replace("Lượt theo dõi: ", "")
            .replace(/,/g, "")
        )
  const tags = $li
    .find(".list-tags")
    .find("p")
    .toArray()
    .map((tag) => {
      return $(tag).text()
    })
  const description = $li.find(".excerpt").text().trim() || null

  return {
    path,
    image,
    name,
    // eslint-disable-next-line camelcase
    last_chapter,
    updated,
    label,
    status,
    views,
    follows,
    tags,
    description,
  }
}