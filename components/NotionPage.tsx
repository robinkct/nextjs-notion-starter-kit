import cs from 'classnames'
import dynamic from 'next/dynamic'
import Image from 'next/legacy/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { type PageBlock } from 'notion-types'
import {
  formatDate,
  getBlockTitle,
  getBlockValue,
  getPageProperty
} from 'notion-utils'
import * as React from 'react'
import BodyClassName from 'react-body-classname'
import {
  type NotionComponents,
  NotionRenderer,
  useNotionContext,
  NotionContextProvider
} from 'react-notion-x'
import { EmbeddedTweet, TweetNotFound, TweetSkeleton } from 'react-tweet'
import { useSearchParam } from 'react-use'

import type * as types from '@/lib/types'
import * as config from '@/lib/config'
import { customMapImageUrl, mapImageUrl } from '@/lib/map-image-url'
import { getCanonicalPageUrl, mapPageUrl } from '@/lib/map-page-url'
import { searchNotion } from '@/lib/search-notion'
import { useDarkMode } from '@/lib/use-dark-mode'

import { Footer } from './Footer'
import { GitHubShareButton } from './GitHubShareButton'
import { Loading } from './Loading'
import { NotionPageHeader } from './NotionPageHeader'
import { Page404 } from './Page404'
import { PageAside } from './PageAside'
import { PageHead } from './PageHead'
import styles from './styles.module.css'

// -----------------------------------------------------------------------------
// dynamic imports for optional components
// -----------------------------------------------------------------------------

const Code = dynamic(() =>
  import('react-notion-x/third-party/code').then(async (m) => {
    // add / remove any prism syntaxes here
    await Promise.allSettled([
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-markup-templating.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-markup.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-bash.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-c.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-cpp.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-csharp.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-docker.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-java.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-js-templates.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-coffeescript.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-diff.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-git.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-go.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-graphql.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-handlebars.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-less.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-makefile.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-markdown.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-objectivec.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-ocaml.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-python.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-reason.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-rust.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-sass.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-scss.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-solidity.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-sql.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-stylus.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-swift.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-wasm.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-yaml.js')
    ])
    return m.Code
  })
)

const Collection = dynamic(() =>
  import('react-notion-x/third-party/collection').then((m) => m.Collection)
)
const Equation = dynamic(() =>
  import('react-notion-x/third-party/equation').then((m) => m.Equation)
)
const Pdf = dynamic(
  () => import('react-notion-x/third-party/pdf').then((m) => m.Pdf),
  {
    ssr: false
  }
)
const Modal = dynamic(
  () =>
    import('react-notion-x/third-party/modal').then((m) => {
      m.Modal.setAppElement('.notion-viewport')
      return m.Modal
    }),
  {
    ssr: false
  }
)

function Tweet({ id }: { id: string }) {
  const { recordMap } = useNotionContext()
  const tweet = (recordMap as types.ExtendedTweetRecordMap)?.tweets?.[id]

  return (
    <React.Suspense fallback={<TweetSkeleton />}>
      {tweet ? <EmbeddedTweet tweet={tweet} /> : <TweetNotFound />}
    </React.Suspense>
  )
}

const propertyLastEditedTimeValue = (
  { block, pageHeader }: any,
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && block?.last_edited_time) {
    return (
      <span suppressHydrationWarning={true}>
        Last updated{' '}
        {formatDate(block?.last_edited_time, {
          month: 'long'
        })}
      </span>
    )
  }

  return defaultFn()
}

const propertyDateValue = (
  { data, schema, pageHeader }: any,
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && schema?.name?.toLowerCase() === 'published') {
    const publishDate = data?.[0]?.[1]?.[0]?.[1]?.start_date

    if (publishDate) {
      return (
        <span suppressHydrationWarning={true}>
          {formatDate(publishDate, {
            month: 'long'
          })}
        </span>
      )
    }
  }

  return defaultFn()
}

const propertyTextValue = (
  { schema, pageHeader }: any,
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && schema?.name?.toLowerCase() === 'author') {
    return <b>{defaultFn()}</b>
  }

  return defaultFn()
}

const notionRendererComponents: Partial<NotionComponents> = {
  nextLegacyImage: Image,
  nextLink: Link,
  Code,
  Collection,
  Equation,
  Pdf,
  Modal,
  Tweet,
  Header: NotionPageHeader,
  propertyLastEditedTimeValue,
  propertyTextValue,
  propertyDateValue
}

export function NotionPage({
  site,
  recordMap,
  error,
  pageId
}: types.PageProps) {
  const [hasMounted, setHasMounted] = React.useState(false)
  const router = useRouter()
  const lite = useSearchParam('lite')

  React.useEffect(() => {
    setHasMounted(true)
  }, [])

  const components = React.useMemo<Partial<NotionComponents>>(
    () => ({
      ...notionRendererComponents,
      Collection: (props: any) => {
        console.log(`[DEBUG] Collection wrapper called for block: ${props.block?.id}, type: ${props.block?.type}, pageId: ${pageId}`)
        if (
          props.block?.type === 'collection_view' ||
          props.block?.type === 'collection_view_page' ||
          props.block?.type === 'collection' ||
          props.block?.collection_id // fallback just in case
        ) {
          const viewIds = props.block.view_ids || []
          if (viewIds && viewIds.length > 0) {
            const shouldHideTitle = true // ALWAYS hide title as requested

            if (shouldHideTitle) {
              viewIds.forEach((viewId: string) => {
                const view = recordMap?.collection_view?.[viewId]?.value as any
                if (!view) return

                view.format = view.format || {}
                view.format.hide_linked_collection_name = true

                // Notion api does not fetch child blocks for page_content gallery images.
                // If the gallery_cover is set to page_content or page_content_first, we override it to page_cover.
                if (
                  view?.format?.gallery_cover?.type === 'page_content' ||
                  view?.format?.gallery_cover?.type === 'page_content_first' ||
                  view?.format?.gallery_cover?.type === 'none' ||
                  view?.format?.gallery_cover === undefined
                ) {
                  view.format.gallery_cover = { type: 'page_cover' }
                }
              })
            }
            // We removed the blockIds mutation logic here because it was unreliable.
          }
        }
        return <Collection {...props} showCollectionViewDropdown={false} />
      }
    }),
    [recordMap, pageId]
  )

  // lite mode is for oembed
  const isLiteMode = hasMounted && lite === 'true'

  const { isDarkMode: isDarkModeReal } = useDarkMode()
  const isDarkMode = hasMounted && isDarkModeReal

  const siteMapPageUrl = React.useMemo(() => {
    const params: any = {}
    if (lite) params.lite = lite

    const searchParams = new URLSearchParams(params)
    return site ? mapPageUrl(site, recordMap!, searchParams) : undefined
  }, [site, recordMap, lite])

  const keys = Object.keys(recordMap?.block || {})
  const block = getBlockValue(recordMap?.block?.[keys[0]!])

  // const isRootPage =
  //   parsePageId(block?.id) === parsePageId(site?.rootNotionPageId)
  const isBlogPost =
    block?.type === 'page' && block?.parent_table === 'collection'

  const showTableOfContents = !!isBlogPost
  const minTableOfContentsItems = 3

  const pageAside = React.useMemo(
    () => (
      <PageAside
        block={block!}
        recordMap={recordMap!}
        isBlogPost={isBlogPost}
      />
    ),
    [block, recordMap, isBlogPost]
  )

  if (router.isFallback) {
    return <Loading />
  }

  if (error || !site || !block || !recordMap) {
    return <Page404 site={site} pageId={pageId} error={error} />
  }

  const title = getBlockTitle(block, recordMap) || site.name

  console.log('notion page', {
    isDev: config.isDev,
    title,
    pageId,
    rootNotionPageId: site.rootNotionPageId,
    recordMap
  })

  if (!config.isServer) {
    // add important objects to the window global for easy debugging
    const g = window as any
    g.pageId = pageId
    g.recordMap = recordMap
    g.block = block
  }

  const canonicalPageUrl = config.isDev
    ? undefined
    : getCanonicalPageUrl(site, recordMap)(pageId)

  const socialImage = customMapImageUrl(
    getPageProperty<string>('Social Image', block, recordMap) ||
    (block as PageBlock).format?.page_cover ||
    config.defaultPageCover,
    block,
    recordMap
  )

  const socialDescription =
    getPageProperty<string>('Description', block, recordMap) ||
    config.description

  // Custom filtering for the Book page
  if (recordMap && (pageId === site.rootNotionPageId || (pageId && pageId.replace(/-/g, '') === '314db9568fde8058946edd16cc0e6afc'))) {
    const collectionIds = Object.keys(recordMap.collection || {})
    if (collectionIds.length > 0) {
      const collectionId = collectionIds[0]
      const collectionVal = recordMap.collection[collectionId]?.value as any
      const schema = collectionVal?.schema || collectionVal?.value?.schema
      if (schema) {
        const tagsPropId = Object.keys(schema).find(k => schema[k].name?.toLowerCase() === 'tags')
        if (tagsPropId) {
          const hiddenBlockIds = new Set<string>()
          Object.values(recordMap.block).forEach((b: any) => {
            const rowBlock = b?.value?.value || b?.value
            if (rowBlock) {
              if (rowBlock.type === 'page' && rowBlock.id !== site.rootNotionPageId && rowBlock.id?.replace(/-/g, '') !== '314db9568fde8058946edd16cc0e6afc') {
                const tagsPropValue = rowBlock.properties?.[tagsPropId]
                const tagsStr = tagsPropValue ? JSON.stringify(tagsPropValue).toLowerCase() : ''

                if (!tagsStr.includes('book')) {
                  hiddenBlockIds.add(rowBlock.id)
                }
              }
            }
          })

          const queries = recordMap.collection_query?.[collectionId as string]
          if (queries) {
            Object.values(queries).forEach((query: any) => {
              if (query.collection_group_results?.blockIds) {
                query.collection_group_results.blockIds = query.collection_group_results.blockIds.filter(
                  (id: string) => !hiddenBlockIds.has(id)
                )
              }
            })
          }
        }
      }
    }
  }

  return (
    <>
      <PageHead
        pageId={pageId}
        site={site}
        title={title}
        description={socialDescription}
        image={socialImage}
        url={canonicalPageUrl}
        isBlogPost={isBlogPost}
      />

      {hasMounted ? (
        <>
          {isLiteMode && <BodyClassName className='notion-lite' />}
          {isDarkMode && <BodyClassName className='dark-mode' />}

          <NotionRenderer
            bodyClassName={cs(
              styles.notion,
              pageId === site.rootNotionPageId && 'index-page'
            )}
            darkMode={isDarkMode}
            components={components}
            recordMap={recordMap}
            rootPageId={site.rootNotionPageId}
            rootDomain={site.domain}
            fullPage={!isLiteMode}
            previewImages={!!recordMap.preview_images}
            showCollectionViewDropdown={false}
            showTableOfContents={showTableOfContents}
            minTableOfContentsItems={minTableOfContentsItems}
            defaultPageIcon={config.defaultPageIcon}
            defaultPageCover={config.defaultPageCover}
            defaultPageCoverPosition={config.defaultPageCoverPosition}
            mapPageUrl={siteMapPageUrl}
            mapImageUrl={(url, block) => customMapImageUrl(url, block, recordMap)}
            searchNotion={config.isSearchEnabled ? searchNotion : undefined}
            pageAside={pageAside}
            footer={<Footer />}
          />

          <GitHubShareButton />
        </>
      ) : (
        <Loading />
      )}
    </>
  )
}
