import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { paramsToQuery, queryToParams } from '@/lib/projectFilters'
import { useProjectsView } from '@/store/projectsView'

// Keep commas readable in shared links: ?client=c1,c2 instead of ?client=c1%2Cc2
const toSearch = (params: URLSearchParams) => params.toString().replace(/%2C/gi, ',')
const normalize = (search: string) => toSearch(new URLSearchParams(search))

/**
 * Two-way sync between the projects query in Zustand and the URL search params.
 * URL → store whenever the location changes (refresh, back/forward, saved views);
 * store → URL (replace) whenever filters change in the UI.
 */
export function useProjectQuerySync() {
  const { search, pathname } = useLocation()
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  useLayoutEffect(() => {
    navigateRef.current = navigate
  })

  useEffect(() => {
    const { query, setQuery } = useProjectsView.getState()
    if (toSearch(queryToParams(query)) !== normalize(search)) setQuery(paramsToQuery(new URLSearchParams(search)))
  }, [search])

  useEffect(
    () =>
      useProjectsView.subscribe((state, prev) => {
        if (state.query === prev.query) return
        const next = toSearch(queryToParams(state.query))
        if (next !== normalize(window.location.search)) {
          navigateRef.current({ pathname, search: next ? `?${next}` : '' }, { replace: true })
        }
      }),
    [pathname],
  )
}
