import { NextPage, GetStaticProps } from "next";
import { AppBar, Box, Card, CardContent, CardMedia, Container, Grid, IconButton, Toolbar, Typography } from "@mui/material";
import Button, { ButtonProps } from "@mui/material/Button"
import { Menu as MenuIcon } from "@mui/icons-material";
import event from "./tmp.json";

const EventPage: NextPage<EventPageProps> = ({ event }) => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <AppBar position="static">
        <Toolbar variant="dense">
          <Typography component="h1" sx={{ flexGrow: 1 }}>
            { event.name }
          </Typography>
          <IconButton aria-label="menu" color="inherit">
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container sx={{ flex: "auto", overflowY: "scroll" , py: 1 }}>
        <Grid container spacing={1} alignItems="stretch">
          {
            event.items.map(item => (
              <Grid item key={item.id} xs={12} sm={6} md={4} lg={3}>
                <Item item={item}/>
              </Grid>
            ))
          }
        </Grid>
      </Container>
      <Container sx={{ py: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography fontSize="2em" fontWeight="bold" sx={{ flex: "auto" }}>
            &yen; 0
          </Typography>
          <Button variant="contained">確定</Button>
        </Box>
      </Container>
    </Box>
  );
};

export default EventPage;

const Item: React.FC<{ item: Item }> = ({ item }) => (
  <Card sx={{ display: "flex", flexDirection: "row", height: "100%" }}>
    <CardMedia
      component="img"
      image={ item.img }
      sx={{ flex: "1 1 0", alignSelf: "stretch", objectFit: "contain", background: "black" }}
    />
    <CardContent sx={{ flex: "2 1 0", alignSelf: "center", display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography component="b" sx={{ fontWeight: "bold" }}>
        { item.name }
      </Typography>
      <Box sx={{display: "flex", gap: 1}}>
        <ItemNumberInputButton sx={{ flex: "1 1 0" }}>0</ItemNumberInputButton>
        <ItemNumberInputButton sx={{ flex: "1 1 0" }}>1</ItemNumberInputButton>
        <ItemNumberInputButton sx={{ flex: "1 1 0" }}>2</ItemNumberInputButton>
        <ItemNumberInputButton sx={{ flex: "1 1 0" }}>+</ItemNumberInputButton>
      </Box>
    </CardContent>
  </Card>
);

const ItemNumberInputButton = (props: ButtonProps) => (
  <Button
    variant="outlined"
    {...props}
    sx={{ minWidth: 0, fontSize: "1.5em", lineHeight: "normal", padding: 0.5, ...props.sx }}
  />
);

export const getStaticProps: GetStaticProps<EventPageProps> = async () => {
  return {
    props: {
      event: event
    }
  };
};

type EventPageProps = {
  event: EventType
};

type EventType = {
  id: number,
  code: string,
  name: string,
  items: Item[],
  prices: Price[],
};

type Item = {
  id: number,
  name: string,
  img?: string,
};

type Price = {
  id: number,
  items: number[],
  value: number,
};
