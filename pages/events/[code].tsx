import React from "react";
import { GetServerSideProps } from "next";
import { PrismaClient } from "@prisma/client";
import type { Event, Item } from "@prisma/client";
import { AppBar, Box, Card, CardContent, CardMedia, Container, Grid, IconButton, Toolbar, Typography } from "@mui/material";
import Button, { ButtonProps } from "@mui/material/Button"
import { Menu as MenuIcon } from "@mui/icons-material";

type EventPageProps = {
  event: Event & { items: Item[] }
};

type EventPageState = {
  numbers: Map<number, number>,
}

export const getServerSideProps: GetServerSideProps<EventPageProps> = async ({ params }) => {
  const prisma = new PrismaClient();
  const event = await prisma.event.findUnique({
    where: { code: params!.code as string },
    include: { items: true }
  })
  if (event) {
    return ({
      props: { event },
    });
  } else {
    return ({
      notFound: true,
    })
  }
};

export default class EventPage extends React.Component<EventPageProps, EventPageState> {

  constructor(props: EventPageProps) {
    super(props);

    this.state = {
      numbers: new Map(props.event.items.map(item => [item.id, 0]))
    };
  }

  render() {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <AppBar position="static">
          <Toolbar variant="dense">
            <Typography component="h1" sx={{ flexGrow: 1 }}>
              { this.props.event.name }
            </Typography>
            <IconButton aria-label="menu" color="inherit">
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Container sx={{ flex: "auto", overflowY: "scroll" , py: 1 }}>
          <Grid container spacing={1} alignItems="stretch">
            {
              this.props.event.items.map(item => (
                <Grid item key={ item.id } xs={12} md={6} lg={4} xl={3}>
                  <ItemComponent
                    item={ item }
                    number={ this.state.numbers.get(item.id)! }
                    onNumberChange={ newValue => this.numberChanged(item.id, newValue) }
                  />
                </Grid>
              ))
            }
          </Grid>
        </Container>
        <Container sx={{ py: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography fontSize="2em" fontWeight="bold" sx={{ flex: "auto" }}>
              &yen; { this.totalAmount().toLocaleString("ja-JP") }
            </Typography>
            <Button variant="contained" onClick={ this.registered }>登録</Button>
          </Box>
        </Container>
      </Box>
    );
  }

  totalAmount(): number {
    return (
      this.props.event.items
      .map(item => item.unitPrice * this.state.numbers.get(item.id)!)
      .reduce((a, b) => a + b)
    );
  }

  numberChanged = (id: number, newValue: number) => {
    this.setState(currentState => ({
      numbers: new Map(currentState.numbers).set(id, newValue)
    }));
  }

  registered = () => {
    this.setState({
      numbers: new Map(this.props.event.items.map(item => [item.id, 0]))
    })
  }
};

type ItemProps = {
  item: Item,
  number: number,
  onNumberChange: (newValue: number) => void,
};

const ItemComponent: React.FC<ItemProps> = ({ item, number, onNumberChange }) => (
  <Card sx={{ display: "flex", flexDirection: "row", height: "100%" }}>
    <CardMedia
      component="img"
      image={ item.img || "about:blank" }
      sx={{ flex: "1 1 0", alignSelf: "stretch", objectFit: "contain", background: "black" }}
    />
    <CardContent sx={{ flex: "3 1 0", alignSelf: "center", display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography component="b" sx={{ fontWeight: "bold" }}>
        { item.name }
      </Typography>
      <ItemNumberInput value={ number } onValueChange={ onNumberChange } />
    </CardContent>
  </Card>
);

type ItemNumberInputProps = {
  value: number,
  onValueChange: (newValue: number) => void,
}

const ItemNumberInput = ({ value, onValueChange }: ItemNumberInputProps) => (
  <Box sx={{display: "flex", gap: 1}}>
    <ItemNumberInputButtonNumber
      sx={{ flex: "1 1 0" }}
      onClick={ () => onValueChange(0) }
      selected={ value === 0 }
    >
      0
    </ItemNumberInputButtonNumber>
    <ItemNumberInputButtonNumber
      sx={{ flex: "1 1 0" }}
      onClick={ () => onValueChange(1) }
      selected={ value === 1 }
    >
      1
    </ItemNumberInputButtonNumber>
    <ItemNumberInputButtonNumber
      sx={{ flex: "1 1 0" }}
      onClick={ () => onValueChange(2) }
      selected={ value === 2 }
    >
      2
    </ItemNumberInputButtonNumber>
    <ItemNumberInputButton sx={{ flex: "1 1 0" }}>+</ItemNumberInputButton>
  </Box>
);

const ItemNumberInputButtonNumber = ({ selected, ...props }: ButtonProps & { selected: boolean }) => (
  <ItemNumberInputButton variant={ selected ? "contained" : "outlined" } { ...props }/>
)

const ItemNumberInputButton = (props: ButtonProps) => (
  <Button
    variant="outlined"
    {...props}
    sx={{ minWidth: 0, fontSize: "1.5em", lineHeight: "normal", px: 0.5, py: 1, ...props.sx }}
  />
);
