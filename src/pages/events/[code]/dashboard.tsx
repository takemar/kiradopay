import React from "react";
import { GetServerSideProps } from "next";
import getConfig from "next/config";
import { PrismaClient } from "@prisma/client";
import type { Client, Event, Item, ItemsOnSalesRecords, SalesRecord } from "@prisma/client";
import { WebSocketServer } from "ws";
import sum from "lodash.sum";
import Layout from "../../../components/Layout";
import type { WebSocketWithInfo } from "../../../server/websocket";
import { useProfile } from "../../../profile";

type DashboardProps = {
  event: Event,
  items: Item[],
  salesRecords: (SalesRecord & { client: Client, items: ItemsOnSalesRecords[] })[],
  offlineClients: Client[],
  onlineClients: Client[],
}

export const getServerSideProps: GetServerSideProps<DashboardProps> = async ({ params }) => {
  const prisma = new PrismaClient();
  const event = await prisma.event.findUnique({
    where: { code: params!.code as string },
    include: { items: true }
  });
  if (!event) {
    return ({
      notFound: true,
    });
  }

  const openningClients = new Map(
    (await prisma.client.findMany({
      where: {
        openningEvents: {
          some: {
            id: event.id,
          },
        },
      },
      orderBy: {
        id: "asc",
      }
    }))
    .map(client => [client.id, client])
  );

  const { serverRuntimeConfig } = getConfig();
  const wss: WebSocketServer = serverRuntimeConfig.wss;
  const onlineClientIds = new Set(
    (Array.from(wss.clients) as WebSocketWithInfo[])
    .filter(ws => ws.info?.clientId && ws.info?.eventId === event.id)
    .map(ws => ws.info!.clientId!)
  );
  const onlineClients = (
    Array.from(onlineClientIds)
    .map(id => openningClients.get(id))
    .filter(client => client)
  ) as Client[];

  const offlineClients = Array.from(openningClients.values()).filter(client => (
    !onlineClientIds.has(client.id)
  ));

  const items = await prisma.item.findMany({
    where: {
      eventId: event.id,
    },
    orderBy: {
      id: "asc",
    }
  });

  const salesRecords = await prisma.salesRecord.findMany({
    where: {
      eventId: event.id
    },
    include: {
      client: true,
      items: true,
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  return ({
    props: { event, items, salesRecords, offlineClients, onlineClients },
  });
};

const Dashboard: React.FC<DashboardProps> = (props) => {
  const profile = useProfile();

  return(
    <Layout
      headTitle={ `${ props.event.name } - Kiradopay` }
      bodyTitle={ props.event.name }
      menuItems={[
        { href: "/", textContent: "トップ" },
        { href: "/profile", textContent: "名前の変更" },
        { href: `/events/${ props.event.code }`, textContent: "このイベントのレジ画面" },
      ]}
      profile={ profile }
    >
      <div>
        { `売上の合計金額：${ sum(props.salesRecords.map(s => s.totalAmount)).toLocaleString("ja-JP") }` }
      </div>
      <ul>
        {
          props.items.map(item => (
            <li key={ item.id }>
              {
                `${
                  item.name
                }の合計頒布数：${
                  sum(props.salesRecords.map(s => s.items.find(i => i.itemId === item.id)?.number || 0))
                }`
              }
            </li>
          ))
        }
      </ul>
      <table>
        <tr>
          <th>timestamp</th>
          {
            props.items.map(item => (
              <th key={ item.id }>{ item.name }</th>
            ))
          }
          <th>金額</th>
          <th>端末</th>
        </tr>
        {
          props.salesRecords.map(salesRecord => (
            <tr key={ salesRecord.code }>
              <td>{ salesRecord.timestamp.toLocaleString() }</td>
              {
                props.items.map(item => (
                  <td key={ item.id } style={{ textAlign: "right" }}>
                    { salesRecord.items.find(i => i.itemId === item.id)?.number || 0 }
                  </td>
                ))
              }
              <td style={{ textAlign: "right" }}>{ salesRecord.totalAmount.toLocaleString("ja-JP") }</td>
              <td>{ salesRecord.client.name }</td>
            </tr>
          ))
        }
      </table>
    </Layout>
  );
}

export default Dashboard;
