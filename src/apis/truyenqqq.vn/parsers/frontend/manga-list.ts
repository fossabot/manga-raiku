import { parseAnchor } from "src/apis/__helpers__/parseAnchor"
import { parseDom } from "src/apis/__helpers__/parseDom"

export default function (html: string) {
  const $ = parseDom(html)

  return (
    $("a")
      .toArray()
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .map((item) => parseAnchor($(item))!)
  )
}
