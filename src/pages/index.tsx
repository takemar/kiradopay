import type { GetServerSideProps, NextPage } from 'next'
import Head from 'next/head'
import { PrismaClient } from "@prisma/client";
import type { Event as EventObject } from "@prisma/client";
import { Button, Container } from '@mui/material';

type TopPageProps = { events: EventObject[] };

export const getServerSideProps: GetServerSideProps<TopPageProps> = async ({ params }) => (
  {
    props: {
      events: await new PrismaClient().event.findMany({ orderBy: { date: "asc" }}),
    },
  }
);

const TopPage: NextPage<TopPageProps> = ({ events }) => (
  <>
    <Head>
      <title>Kiradopay</title>
    </Head>
    <Container sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      rowGap: 2,
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
  </>
);

export default TopPage;
