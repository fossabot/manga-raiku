import { PostWorker } from "src/apis/wrap-worker"

import { CURL } from "../const"
import type general from "../parsers/[general]"
import type Parse from "../parsers/index"
import WorkerGeneral from "../workers/[general]?worker"
import Worker from "../workers/index?worker"

export default async function index() {
  const [index, topDay] = await Promise.all([
    get(CURL).then((res) =>
      PostWorker<typeof Parse>(Worker, res.data, Date.now())
    ),
    get(`${CURL}/tim-truyen?status=-1&sort=13`).then((res) =>
      PostWorker<typeof general>(WorkerGeneral, res.data, Date.now())
    ),
  ])

  return {
    sliders: topDay.items.slice(0, 7),
    hot: topDay.items.slice(7),
    last_update: index.last_update,
    top: index.top,
  }
}
