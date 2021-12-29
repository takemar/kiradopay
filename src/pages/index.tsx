import { useEffect, useState } from 'react';
import type { GetServerSideProps, NextPage } from 'next'
import Head from 'next/head'
import { PrismaClient } from "@prisma/client";
import type { Event as EventObject } from "@prisma/client";
import { Box, Button, Container, MenuItem } from '@mui/material';
import Navigation from '../Navigation';
import AppIDB from '../AppIDB';
import { ClientInfo } from '../client-info';

type TopPageProps = { events: EventObject[] };

export const getServerSideProps: GetServerSideProps<TopPageProps> = async ({ params }) => (
  {
    props: {
      events: await new PrismaClient().event.findMany({ orderBy: { date: "asc" }}),
    },
  }
);

const TopPage: NextPage<TopPageProps> = ({ events }) => {
  const [clientInfo, _] = useState(new ClientInfo({ idb: new AppIDB() }));
  useEffect(() => {
    clientInfo.initialize();
  }, [clientInfo]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Head>
        <title>Kiradopay - トップ</title>
      </Head>
      <Navigation clientInfo={ clientInfo } title="Kiradopay">
        {/* FIXME: これは <ul><a></a></ul> を生産する。 */}
        <MenuItem component="a" href="/profile">
          名前の変更
        </MenuItem>
      </Navigation>
      <Container sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        rowGap: 2,
        flex: "auto",
        overflowY: "auto" ,
        py: 2
      }}>
        {
          events.map(event => (
            <Button
              key={ event.id }
              variant="contained"
              href={  `/events/${ event.code }` }
              sx={{ fontSize: "1.5em", lineHeight: "normal", py: 1}}
            >
              { event.name }
            </Button>
          ))
        }
      </Container>
    </Box>
  );
};

export default TopPage;
