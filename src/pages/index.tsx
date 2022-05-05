import type { GetServerSideProps, NextPage } from 'next'
import { PrismaClient } from "@prisma/client";
import type { Event as EventObject } from "@prisma/client";
import { Button } from '@mui/material';
import Layout from '../components/Layout';
import { useProfile } from '../profile';

type TopPageProps = { events: EventObject[] };

export const getServerSideProps: GetServerSideProps<TopPageProps> = async ({ params }) => (
  {
    props: {
      events: await new PrismaClient().event.findMany({ orderBy: { date: "asc" }}),
    },
  }
);

const TopPage: NextPage<TopPageProps> = ({ events }) => {
  const profile = useProfile();

  return(
    <Layout
      headTitle="Kiradopay - トップ"
      bodyTitle="Kiradopay"
      menuItems={[
        { href: "/profile", textContent: "名前の変更" },
      ]}
      profile={ profile }
      containerProps={{
        sx: {
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          rowGap: 2,
        },
      }}
    >
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
    </Layout>
  );
};

export default TopPage;
