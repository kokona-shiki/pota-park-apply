// src/pages/add-park/SearchResults.tsx
import { Box, Typography } from '@mui/material';

interface SearchResultsProps {
  searchResults: string[];
}

function SearchResults({ searchResults }: SearchResultsProps) {
  if (searchResults.length === 0) return null;

  return (
    <Box
      sx={{
        mt: 1,
        maxHeight: 200,
        overflowY: 'auto',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 1,
        backgroundColor: 'background.paper',
      }}
    >
      {searchResults.map((result, index) => (
        <Typography
          key={`search-${index}-${result.substring(0, 10)}`}
          sx={{
            py: 0.5,
            fontSize: '0.875rem',
            borderBottom: index < searchResults.length - 1 ? '1px solid' : 'none',
            borderColor: 'divider',
          }}
        >
          {result}
        </Typography>
      ))}
    </Box>
  );
}

export default SearchResults;