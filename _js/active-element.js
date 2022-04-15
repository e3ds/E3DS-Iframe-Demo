const array_of_items = document.querySelectorAll("li");

array_of_items.forEach((item) => {
    item.addEventListener("click", (e) => {
        const clickedItem = e.target;
        console.log("Clicked item", clickedItem);
        document.querySelectorAll("li.active").forEach((activeItems) => {
            activeItems.classList.remove("active");
        });
        item.classList.add("active");
    });
});