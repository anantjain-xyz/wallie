import { useSearchParams } from "react-router-dom";

export interface FilterState {
  orderBy: string;
  orderDirection: `asc` | `desc`;
  status?: string[];
  priority?: string[];
  estimate?: (number | null)[];
  query?: string;
}

export function getFilterStateFromSearchParams(
  searchParams: URLSearchParams,
): FilterState {
  const orderBy = searchParams.get(`orderBy`) ?? `priority`;
  const orderDirection =
    (searchParams.get(`orderDirection`) as `asc` | `desc`) ?? `desc`;
  const status = searchParams
    .getAll(`status`)
    .map((status) => status.toLocaleLowerCase().split(`,`))
    .flat();
  const priority = searchParams
    .getAll(`priority`)
    .map((status) => status.toLocaleLowerCase().split(`,`))
    .flat();
  const estimate = searchParams
    .getAll(`estimate`)
    .map((est) =>
      est.split(`,`).map((val) => (val === "null" ? null : Number(val))),
    )
    .flat()
    .filter((est) => est === null || !isNaN(est as number));
  const query = searchParams.get(`query`);

  const state = {
    orderBy,
    orderDirection,
    status,
    priority,
    estimate,
    query: query || undefined,
  };

  return state;
}

export function useFilterState(): [
  FilterState,
  (state: Partial<FilterState>) => void,
] {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = getFilterStateFromSearchParams(searchParams);

  const setState = (state: Partial<FilterState>) => {
    const { orderBy, orderDirection, status, priority, estimate, query } =
      state;
    setSearchParams((searchParams) => {
      if (orderBy) {
        searchParams.set(`orderBy`, orderBy);
      } else {
        searchParams.delete(`orderBy`);
      }
      if (orderDirection) {
        searchParams.set(`orderDirection`, orderDirection);
      } else {
        searchParams.delete(`orderDirection`);
      }
      if (status && status.length > 0) {
        searchParams.set(`status`, status.join(`,`));
      } else {
        searchParams.delete(`status`);
      }
      if (priority && priority.length > 0) {
        searchParams.set(`priority`, priority.join(`,`));
      } else {
        searchParams.delete(`priority`);
      }
      if (estimate && estimate.length > 0) {
        searchParams.set(
          `estimate`,
          estimate.map((e) => (e === null ? "null" : e)).join(`,`),
        );
      } else {
        searchParams.delete(`estimate`);
      }
      if (query) {
        searchParams.set(`query`, query);
      } else {
        searchParams.delete(`query`);
      }
      return searchParams;
    });
  };

  return [state, setState];
}

export function filterStateToSql(filterState: FilterState) {
  let i = 1;
  const sqlWhere = [];
  const sqlParams = [];
  if (filterState.status?.length) {
    sqlWhere.push(
      `status IN (${filterState.status.map(() => `$${i++}`).join(" ,")})`,
    );
    sqlParams.push(...filterState.status);
  }
  if (filterState.priority?.length) {
    sqlWhere.push(
      `priority IN (${filterState.priority.map(() => `$${i++}`).join(" ,")})`,
    );
    sqlParams.push(...filterState.priority);
  }
  if (filterState.estimate?.length) {
    // Handle null values separately
    const nullFilter = filterState.estimate.includes(null);
    const numberEstimates = filterState.estimate.filter(
      (e) => e !== null,
    ) as number[];

    if (nullFilter && numberEstimates.length > 0) {
      // Both null and number values
      sqlWhere.push(
        `(estimate IS NULL OR estimate IN (${numberEstimates.map(() => `$${i++}`).join(" ,")}))`,
      );
      sqlParams.push(...numberEstimates);
    } else if (nullFilter) {
      // Only null values
      sqlWhere.push(`estimate IS NULL`);
    } else if (numberEstimates.length > 0) {
      // Only number values
      sqlWhere.push(
        `estimate IN (${numberEstimates.map(() => `$${i++}`).join(" ,")})`,
      );
      sqlParams.push(...numberEstimates);
    }
  }
  if (filterState.query) {
    sqlWhere.push(`
      (setweight(to_tsvector('simple', coalesce(title, '')), 'A') || 
       setweight(to_tsvector('simple', coalesce(description, '')), 'B'))
      @@ plainto_tsquery('simple', $${i++})
    `);
    sqlParams.push(filterState.query);
  }
  let orderByClause = filterState.orderBy;

  // Use a CASE statement to order priorities correctly
  if (filterState.orderBy === "priority") {
    orderByClause = `
      CASE priority
        WHEN 'urgent' THEN 5
        WHEN 'high' THEN 4
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 2
        WHEN 'none' THEN 1
        ELSE 0
      END
    `;
  }

  const sql = `
    SELECT *
    FROM issue
    WHERE
      ${sqlWhere.length ? `${sqlWhere.join(" AND ")} AND ` : ""}
      deleted = false
    ORDER BY
      ${orderByClause} ${filterState.orderDirection},
      id ASC
  `;
  return { sql, sqlParams };
}
