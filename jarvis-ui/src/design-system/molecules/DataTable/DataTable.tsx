import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
} from "@mui/material"
import type { ReactNode } from "react"

interface Column<T = unknown> {
  key: string
  label: string
  width?: string | number
  render?: (value: unknown, row: T) => ReactNode
}

interface Props<T = object> {
  columns: Column<T>[]
  rows: T[]
  emptyMessage?: string
}

export const DataTable = <T extends object>({
  columns,
  rows,
  emptyMessage = 'No hay datos disponibles.',
}: Props<T>) => {
  return (
    <TableContainer
      component={Paper}
      sx={{
        borderRadius: 3,
        border: '1px solid #D0DBF0',
        boxShadow: '0 2px 12px rgba(26,58,107,0.08)',
        overflowX: 'auto',
      }}
    >
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={col.key}
                width={col.width}
                sx={{
                  bgcolor: '#2B5BA8',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  borderColor: '#2B5BA8',
                  py: 1.25,
                }}
              >
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} sx={{ textAlign: 'center', py: 5 }}>
                <Typography variant="body2" sx={{ color: '#5A6A85' }}>
                  {emptyMessage}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                sx={{
                  bgcolor: rowIndex % 2 === 1 ? '#F4F7FB' : '#fff',
                  '&:hover': {
                    bgcolor: '#EEF2F9',
                    transition: 'background-color 0.15s',
                  },
                  cursor: 'default',
                }}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    sx={{
                      fontSize: 13,
                      color: '#1C2B4A',
                      borderColor: '#D0DBF0',
                      py: 1.25,
                      verticalAlign: 'middle',
                    }}
                  >
                    {col.render
                      ? col.render((row as Record<string, unknown>)[col.key], row)
                      : (
                        <Box component="span">
                          {(row as Record<string, unknown>)[col.key] !== undefined && (row as Record<string, unknown>)[col.key] !== null
                            ? String((row as Record<string, unknown>)[col.key])
                            : '—'}
                        </Box>
                      )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
