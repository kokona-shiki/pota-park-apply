// src/pages/add-park/SearchButtons.tsx
import React from 'react';
import { Box, Button } from '@mui/material';

interface SearchButtonsProps {
  handleSearchPOTA: () => void;
  handleSearchMap: () => void;
  searchingPota: boolean;
  searchingMap: boolean;
  onReset: () => void;
  hasContent: boolean;
}

const SearchButtons: React.FC<SearchButtonsProps> = ({
  handleSearchPOTA,
  handleSearchMap,
  searchingPota,
  searchingMap,
  onReset,
  hasContent,
}) => {
  return (
    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
      <Button onClick={handleSearchPOTA} disabled={searchingPota}>
        {searchingPota ? '搜索中...' : '搜索 POTA'}
      </Button>
      <Button onClick={handleSearchMap} disabled={searchingMap}>
        {searchingMap ? '搜索中...' : '搜索地图'}
      </Button>
      {hasContent && (
        <Button
          onClick={onReset}
          color="secondary"
        >
          清空
        </Button>
      )}
    </Box>
  );
};

export default SearchButtons;