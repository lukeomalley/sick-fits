function Person(name, foods) {
  this.name = name;
  this.foods = foods;
}

// Siumlating an api
Person.prototype.fetchFavFoods = function() {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(this.foods), 2000);
  });
};

describe('learning mocking', () => {
  it('mocks a reg function', () => {
    const fetchDogs = jest.fn();
    fetchDogs('snickers');
    fetchDogs('hugo');
    expect(fetchDogs).toHaveBeenCalled;
    expect(fetchDogs).toHaveBeenCalledWith('snickers');
    expect(fetchDogs).toHaveBeenCalledWith('hugo');
    expect(fetchDogs).toHaveBeenCalledTimes(2);
  });

  it('can create a person', () => {
    const me = new Person('Luke', ['Pizza', 'Hotdogs']);
    expect(me.name).toBe('Luke');
  });

  it('can fetch foods', async () => {
    const me = new Person('Luke', ['Pizza', 'Hotdogs']);
    // Mock the favFoods function
    me.fetchFavFoods = jest.fn().mockResolvedValue(['sushi', 'ramen']);
    const favFoods = await me.fetchFavFoods();
    expect(favFoods).toContain('sushi');
  });
});
