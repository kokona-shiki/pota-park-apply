// src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination } from '@mui/material';
import axios from 'axios';

function Home() {
  const [parks, setParks] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(30);

  useEffect(() => {
    axios.get('https://api.pota.app/entity/parks/318')
      .then(res => {
        const sorted = res.data.sort((a, b) => b.qsos - a.qsos);
        setParks(sorted);
      })
      .catch(err => console.error(err));
  }, []);

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>编号</TableCell>
              <TableCell>名称</TableCell>
              <TableCell>网格</TableCell>
              <TableCell>尝试次数</TableCell>
              <TableCell>激活次数</TableCell>
              <TableCell>QSO数量</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {parks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((park) => (
              <TableRow key={park.reference}>
                <TableCell>{park.reference}</TableCell>
                <TableCell>{park.name}</TableCell>
                <TableCell>{park.grid}</TableCell>
                <TableCell>{park.attempts}</TableCell>
                <TableCell>{park.activations}</TableCell>
                <TableCell>{park.qsos}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[30]}
        component="div"
        count={parks.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}

export default Home;