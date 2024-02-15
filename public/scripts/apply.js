
const careers = document.querySelector('careers');
const descriptions = document.querySelectorAll('description');

const home = document.getElementById('home');
const career = document.getElementById('careers');

home.addEventListener('click', () => {
    document.location.href = '/';});
career.addEventListener('click', () => {
    document.location.href = '/careers';});

careers.addEventListener('click', (event) => {
if (event.target.classList.contains('career')) {
    const descriptions = document.querySelectorAll('.career');
    const descriptionTags = document.querySelectorAll('description');

    descriptions.forEach((element) => {
        element.classList.add('slide');
    });

    descriptionTags.forEach((element) => {
        if (element !== event.target.nextElementSibling && element.classList.contains('show')) {
            element.classList.remove('show');
        }
    });

    const description = event.target.nextElementSibling;
    description.classList.toggle('show');

    let i = 0;
    descriptionTags.forEach((element) => {
        if(!element.classList.contains("show")) {
            i++;
    
        }
    })

    if(i==1) {
        descriptions.forEach((desc) => {
            desc.classList.remove('slide');
        })
    }

}
});






let answers = {
    name: "",
    email: "",
    phone: "",
    port: "",
    pos: "",
}

const ids = ["name", "email", "phone", "port", "pos"];


const submitApplication = () => {
    ids.forEach((id) => {
        answers[id] = document.getElementById(id).value;
    })
    fetch('/api/v1/apply', {
        method: 'POST',
        body: JSON.stringify({
            answers
          }),
        headers: {
            "Content-Type": "application/json",
        }
    })
}