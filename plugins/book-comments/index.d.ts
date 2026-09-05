import type { QuartzComponent, QuartzEmitterPlugin } from "@quartz-community/types"

export interface BookCommentsOptions {
  envId: string
  pathPrefix?: string
}

export declare const BookComments: (options: BookCommentsOptions) => QuartzComponent
export declare const BookCommentsAssets: QuartzEmitterPlugin
export default BookCommentsAssets
